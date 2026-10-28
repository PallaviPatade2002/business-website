import Site from './pages/Site'
import Admin from './pages/Admin'

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <Admin /> : <Site />
}
