package com.rayen.Restaurant.menu;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;

@Service
public class PhotoStorage {
    private final Path directory;
    public PhotoStorage(@Value("${restaurant.upload-dir}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }
    public String store(MultipartFile photo) throws IOException {
        if (photo == null || photo.isEmpty()) throw new DishInputException("photo", "Choose a photo.");
        if (photo.getSize() > 5 * 1024 * 1024) throw new DishInputException("photo", "Photo must be at most 5 MB.");
        BufferedImage image = decode(photo);
        Files.createDirectories(directory);
        String filename = UUID.randomUUID() + ".png";
        Path target = directory.resolve(filename);
        boolean created = false;
        // Re-encode pixels as PNG, stripping original metadata and appended content.
        try (OutputStream output = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW)) {
            created = true;
            if (!ImageIO.write(image, "png", output)) throw new IOException("PNG encoder unavailable");
        } catch (IOException failure) {
            if (created) Files.deleteIfExists(target);
            throw failure;
        }
        return filename;
    }
    private BufferedImage decode(MultipartFile photo) {
        // Decode actual content; filenames and browser MIME types are not trusted.
        try (InputStream input = photo.getInputStream(); ImageInputStream stream = ImageIO.createImageInputStream(input)) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw new DishInputException("photo", "Choose a valid JPEG, PNG or WebP image.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream);
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("jpeg", "jpg", "png", "webp").contains(format))
                    throw new DishInputException("photo", "Only JPEG, PNG and WebP images are accepted.");
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1 || height < 1 || width > 6000 || height > 6000 || (long) width * height > 16000000)
                    throw new DishInputException("photo", "Photo must be at most 6000 pixels per side and 16 megapixels.");
                BufferedImage image = reader.read(0);
                if (image == null) throw new IOException("Undecodable image");
                return image;
            } finally { reader.dispose(); }
        } catch (DishInputException exception) { throw exception; }
        catch (IOException | RuntimeException exception) {
            throw new DishInputException("photo", "This image is damaged or cannot be decoded.");
        }
    }
    public void remove(String filename) throws IOException { Files.deleteIfExists(directory.resolve(filename)); }
    public Path find(String filename) {
        if (!filename.matches("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.png")) return null;
        Path file = directory.resolve(filename);
        return Files.isRegularFile(file) ? file : null;
    }
}
