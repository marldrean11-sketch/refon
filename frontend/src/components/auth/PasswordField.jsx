import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { TextField } from '../ui/TextField.jsx'

export function PasswordField(props) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={isVisible ? 'text' : 'password'}
      icon={LockKeyhole}
      endAdornment={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          className="grid size-10 place-items-center rounded-control text-muted transition duration-200 hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-controls={props.id}
           aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      }
    />
  )
}
