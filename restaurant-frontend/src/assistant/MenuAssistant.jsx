import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { euroPrice } from '../components/dishDisplay'
import { askMenu, recentHistory } from './assistantApi'
import './MenuAssistant.css'

const suggestions = ['Show me vegetarian dishes', 'Suggest a meal under €20', 'How do I book a table?']

export default function MenuAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState(null)
  const dialog = useRef(null)
  const launcher = useRef(null)
  const input = useRef(null)
  const end = useRef(null)
  const active = useRef(null)

  useEffect(() => {
    if (open && !dialog.current.open) {
      dialog.current.showModal()
      input.current?.focus()
    }
    if (!open && dialog.current.open) dialog.current.close()
  }, [open])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }, [messages, busy, error])

  useEffect(() => () => { active.current?.abort(); active.current = null }, [])

  async function send(text, retry = null) {
    const content = text.trim()
    if (!content || content.length > 600 || active.current) return
    const request = retry || { message: content, history: recentHistory(messages) }
    const controller = new AbortController()
    active.current = controller
    setBusy(true)
    setError('')
    setFailed(null)
    if (!retry) {
      setMessages(current => [...current, { role: 'user', content }].slice(-19))
      setDraft('')
    }
    // Stop waiting after 22 seconds; clearing the chat also cancels the pending UI update.
    const timer = window.setTimeout(() => controller.abort(), 22000)
    try {
      const answer = await askMenu(request.message, request.history, controller.signal)
      if (active.current !== controller) return
      setMessages(current => [...current, { role: 'assistant', content: answer.message, answer }].slice(-20))
    } catch (failure) {
      if (active.current !== controller) return
      setError(controller.signal.aborted ? 'The assistant took too long. Please retry.' : failure.message)
      setFailed(request)
    } finally {
      window.clearTimeout(timer)
      if (active.current === controller) {
        active.current = null
        setBusy(false)
        if (dialog.current?.open && document.activeElement === document.body) input.current?.focus()
      }
    }
  }

  function clear() {
    active.current?.abort()
    active.current = null
    setMessages([])
    setDraft('')
    setError('')
    setFailed(null)
    setBusy(false)
    input.current?.focus()
  }

  function close() { setOpen(false) }

  return <>
    <button ref={launcher} type="button" className="menu-assistant-launcher" aria-haspopup="dialog"
      aria-controls="menu-assistant-dialog" onClick={() => setOpen(true)}>
      <span aria-hidden="true">✧</span> Ask about our menu
    </button>
    <dialog ref={dialog} id="menu-assistant-dialog" className="menu-assistant-dialog" aria-labelledby="menu-assistant-title"
      aria-describedby="menu-assistant-privacy" onCancel={close} onClose={() => { setOpen(false); launcher.current?.focus() }}>
      <div className="menu-assistant-shell">
        <header className="menu-assistant-header">
          <div><p>RAYEN RESTAURANT</p><h2 id="menu-assistant-title">Your menu companion</h2></div>
          <button type="button" className="menu-assistant-close" aria-label="Close menu assistant" onClick={close}>×</button>
        </header>
        <div className="menu-assistant-tools">
          <span>AI-assisted · Read-only</span>
          <button type="button" onClick={clear}>Clear conversation</button>
        </div>
        <div className="menu-assistant-scroll">
          <p id="menu-assistant-privacy" className="menu-assistant-intro">Explore current dishes or find out how to book. Messages are sent to our AI provider when configured. Please don’t share personal details.</p>
          <div className="menu-assistant-suggestions" aria-label="Suggested questions">
            {suggestions.map(question => <button type="button" key={question} disabled={busy} onClick={() => send(question)}>{question} <span aria-hidden="true">↗</span></button>)}
          </div>
          <div role="log" aria-label="Menu conversation" aria-live="polite" aria-relevant="additions text" className="menu-assistant-messages">
            {messages.map((message, index) => <article key={index} className={`menu-assistant-message is-${message.role}`}>
              <h3>{message.role === 'user' ? 'You' : 'Menu assistant'}</h3>
              <p>{message.content}</p>
              {message.answer?.dishes?.map(dish => <div className="menu-assistant-dish" key={dish.id}>
                <div><strong>{dish.name}</strong><strong>{euroPrice.format(dish.price)}</strong></div>
                <p>{dish.description}</p>
                {(dish.vegan || dish.vegetarian) && <p>{dish.vegan ? 'Recorded as vegan' : 'Recorded as vegetarian'}</p>}
                <p>Recorded ingredients: {dish.ingredients}</p>
                <p>Recorded allergens: {dish.allergens}</p>
                <Link to={dish.link} onClick={close}>View in Menu →</Link>
              </div>)}
              {message.answer?.links?.map(link => <Link key={link.href} to={link.href} onClick={close}>{link.label} →</Link>)}
            </article>)}
          </div>
          {busy && <p role="status" className="menu-assistant-status">Checking the current menu…</p>}
          {error && <div className="menu-assistant-error" role="alert"><p>{error}</p>
            {failed && <button type="button" disabled={busy} onClick={() => send(failed.message, failed)}>Retry message</button>}
          </div>}
          <div ref={end} />
        </div>
        <form className="menu-assistant-compose" onSubmit={event => { event.preventDefault(); send(draft) }}>
          <label htmlFor="menu-assistant-input">Ask a menu question</label>
          <textarea ref={input} id="menu-assistant-input" autoFocus rows={2} maxLength={600} value={draft}
            onChange={event => setDraft(event.target.value)} aria-describedby="menu-assistant-input-hint"
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault(); send(draft)
              }
            }} />
          <div><small id="menu-assistant-input-hint">{draft.length}/600 · Shift+Enter for a new line</small>
            <button type="submit" disabled={busy || !draft.trim()}>Send</button></div>
          <p>For allergies, always confirm with restaurant staff.</p>
        </form>
      </div>
    </dialog>
  </>
}
