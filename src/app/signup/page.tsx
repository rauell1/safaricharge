/**
 * /signup — redirects to /login (register tab).
 * Kept as a permanent redirect so that any bookmarked or linked /signup
 * URLs continue to work rather than 404ing.
 */
import { permanentRedirect } from 'next/navigation'

export default function SignupPage() {
  permanentRedirect('/login')
}
