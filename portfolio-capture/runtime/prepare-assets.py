from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import json, math, zipfile
import shutil

workspace = Path(__file__).resolve().parents[2]
base = workspace / 'portfolio-capture'
assets = base / 'assets'
shots = assets / 'screenshots'
for original in (base / 'runtime/source-captures').glob('*.jpg'):
    if not (shots / original.name).exists():
        shutil.copy2(original, shots / original.name)
gallery = assets / 'gallery-1440x900'
gallery.mkdir(exist_ok=True)
meta = json.loads((base / 'runtime/capture-metadata.json').read_text())
cream = '#f8f5ec'
green = '#183c30'
gold = '#b49a58'
font_dir = Path('C:/Windows/Fonts')
def font(size, bold=False):
    return ImageFont.truetype(str(font_dir / ('segoeuib.ttf' if bold else 'segoeui.ttf')), size)

def save(name, image):
    image.convert('RGB').save(shots / (name + '.png'), optimize=True)

def section(name, tight=False):
    source = Image.open(shots / (name + '-fullpage.jpg')).convert('RGB')
    m = meta[name]
    x0, x1 = (max(0, math.floor(m['left'] - 20)), min(source.width, math.ceil(m['left'] + m['width'] + 20))) if tight else (0, source.width)
    y0, y1 = max(0, math.floor(m['top'])), min(source.height, math.ceil(m['top'] + m['height']))
    save(name, source.crop((x0, y0, x1, y1)))

# These crops retain complete sections; no website content is retouched.
home = Image.open(shots / '01-homepage.jpg')
save('01-homepage', home.crop((0, 0, home.width, round(644 * home.width / 1440))))
for name in ['02-menu-categories', '03-burgers-category', '05-booking', '06-about-us', '12b-mobile-bestsellers', '14-footer']:
    section(name)
for name in ['08-add-dish', '09-edit-dish']:
    section(name, tight=True)
best = Image.open(shots / '04-bestsellers.jpg')
save('04-bestsellers', best.crop((0, 0, best.width, 810)))
admin = Image.open(shots / '07-admin-menu-dashboard.jpg')
save('07-admin-menu-dashboard', admin.crop((0, 0, admin.width, 830)))
for name in ['07b-admin-filtered', '10b-calendar-day-view', '11-reservation-details', '13-cart']:
    save(name, Image.open(shots / (name + '.jpg')))
save('10-reservation-calendar', Image.open(shots / '10-reservation-calendar-fullpage.jpg'))
save('07c-admin-full-inventory', Image.open(shots / '07-admin-menu-dashboard-fullpage.jpg'))
mobile = Image.open(shots / '12-mobile-homepage.jpg')
save('12-mobile-homepage', mobile.crop((0, 0, mobile.width, round(576 * mobile.width / 390))))

labels = {
 '01-homepage': 'Homepage & promotional banner',
 '02-menu-categories': 'Menu categories',
 '03-burgers-category': 'Category page & dish details',
 '04-bestsellers': 'Our Bestsellers',
 '05-booking': 'Table reservation request form',
 '06-about-us': 'About Us',
 '07-admin-menu-dashboard': 'Admin menu management',
 '07b-admin-filtered': 'Admin category filtering',
 '07c-admin-full-inventory': 'Complete admin inventory',
 '08-add-dish': 'Add Dish form',
 '09-edit-dish': 'Edit Dish form',
 '10-reservation-calendar': 'Reservation calendar — month view',
 '10b-calendar-day-view': 'Reservation calendar — day view',
 '11-reservation-details': 'Reservation details — fictional guest',
 '12-mobile-homepage': 'Mobile homepage',
 '12b-mobile-bestsellers': 'Mobile Bestsellers — stacked cards',
 '13-cart': 'Cart — dish, quantity & total',
 '14-footer': 'Current restaurant footer',
}
for path in sorted(shots.glob('*.png')):
    if path.stem.startswith('12'):
        continue
    canvas = Image.new('RGB', (1440, 900), cream)
    draw = ImageDraw.Draw(canvas)
    draw.text((40, 20), labels[path.stem], font=font(23, True), fill=green)
    draw.line((40, 62, 1400, 62), fill=gold, width=1)
    img = Image.open(path).convert('RGB')
    img = ImageOps.contain(img, (1360, 770), Image.Resampling.LANCZOS)
    x, y = (1440 - img.width)//2, 78 + (770 - img.height)//2
    canvas.paste(img, (x,y))
    draw.rectangle((x-1,y-1,x+img.width,y+img.height),outline='#deddd1',width=1)
    draw.text((40, 865), 'RAYEN RESTAURANT  /  ACTUAL APPLICATION CAPTURE',font=font(12),fill=green)
    draw.text((1030,865), 'Isolated demo · fictional customer data',font=font(12),fill=green)
    canvas.save(gallery / path.name,optimize=True)

# The cover is a graphic composition of actual browser screenshots only.
cover = Image.new('RGB', (1600,1000), green)
d = ImageDraw.Draw(cover)
d.line((64,64,145,64),fill=gold,width=3)
d.text((165,49),'RAYEN RESTAURANT  /  PROJECT SHOWCASE',font=font(20,True),fill='#e4cd92')
d.text((64,100),'Restaurant Website',font=font(67,True),fill=cream)
d.text((64,181),'& Admin Dashboard',font=font(67,True),fill=cream)
d.line((64,282,1536,282),fill='#627455',width=1)

def card(path, xy, max_size):
    im=ImageOps.contain(Image.open(path).convert('RGB'),max_size,Image.Resampling.LANCZOS)
    x,y=xy
    d.rounded_rectangle((x-8,y-8,x+im.width+8,y+im.height+8),radius=14,fill='#eee8d8',outline=gold,width=1)
    cover.paste(im,(x,y))
    return im.size
card(shots/'01-homepage.png',(64,330),(970,450))
card(shots/'07-admin-menu-dashboard.png',(1070,330),(460,440))
card(shots/'12-mobile-homepage.png',(1320,647),(210,310))
d.text((64,810),'Menu browsing  ·  Cart  ·  Table requests',font=font(25,True),fill=cream)
d.text((64,854),'Menu management  ·  Reservation calendar',font=font(25,True),fill=cream)
d.text((64,942),'Actual application captures  /  Fictional demo data',font=font(18),fill='#e4cd92')
cover.save(assets/'restaurant-website-admin-cover.png',optimize=True)

# A local contact sheet makes it easy to visually review every export.
paths = sorted(shots.glob('*.png'))
qa = Image.new('RGB',(1600,math.ceil(len(paths)/4)*320),'#e9e5dc')
qd=ImageDraw.Draw(qa)
for n,path in enumerate(paths):
    thumb=ImageOps.contain(Image.open(path),(380,275),Image.Resampling.LANCZOS)
    x,y=(n%4)*400,(n//4)*320
    qa.paste(thumb,(x+(400-thumb.width)//2,y+20))
    qd.text((x+12,y+298),path.stem,font=font(14),fill=green)
qa.save(base/'runtime/qa-contact-sheet.png')

# Keep unedited service JPEGs outside the delivery folder.
source_dir=base/'runtime/source-captures'
source_dir.mkdir(exist_ok=True)
for path in shots.glob('*.jpg'):
    target=source_dir/path.name
    assert path.resolve().is_relative_to(workspace.resolve()) and target.resolve().is_relative_to(workspace.resolve())
    path.replace(target)
manifest=[]
for path in sorted(assets.rglob('*.png')):
    im=Image.open(path)
    manifest.append({'file':str(path.relative_to(assets)).replace('\\','/'),'width':im.width,'height':im.height})
(assets/'capture-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(f'Prepared {len(paths)} screenshot PNGs, {len(list(gallery.glob("*.png")))} gallery images and one cover.')
