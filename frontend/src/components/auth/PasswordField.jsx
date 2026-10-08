import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { TextField } from '../ui/TextField.jsx'

export function PasswordField(props) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={isVisible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          className="grid size-9 place-items-center rounded-control text-muted transition duration-150 hover:bg-surface-3 hover:text-ink"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-controls={props.id}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  )
}
