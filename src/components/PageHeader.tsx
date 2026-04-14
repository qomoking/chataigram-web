import { useNavigate } from 'react-router-dom'
import './PageHeader.css'

type PageHeaderProps = {
  title?: string
  transparent?: boolean
  backTo?: string
  onBack?: () => void
}

export default function PageHeader({ title, transparent, backTo, onBack }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <header className={`page-header${transparent ? ' page-header--transparent' : ''}`}>
      <button
        type="button"
        className="page-header-back"
        onPointerDown={handleBack}
        aria-label="返回"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      {title && <span className="page-header-title">{title}</span>}
    </header>
  )
}
