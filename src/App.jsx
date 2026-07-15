import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteNovo from './pages/ClienteNovo'
import ClienteFicha from './pages/ClienteFicha'
import RegistrarVisita from './pages/RegistrarVisita'
import OrcamentoEditor from './pages/OrcamentoEditor'
import OrcamentoView from './pages/OrcamentoView'
import OrcamentoPDF from './pages/OrcamentoPDF'
import Funil from './pages/Funil'
import AdminDashboard from './pages/admin/AdminDashboard'
import Aprovacoes from './pages/admin/Aprovacoes'
import Representantes from './pages/admin/Representantes'
import Territorios from './pages/admin/Territorios'
import CarteiraInterna from './pages/admin/CarteiraInterna'
import Catalogo from './pages/admin/Catalogo'
import Logs from './pages/admin/Logs'
import ImportarCarteira from './pages/admin/ImportarCarteira'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function Gestor({ children }) {
  const { isGestor, loading } = useAuth()
  if (loading) return <div className="spinner" />
  if (!isGestor) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/novo" element={<ClienteNovo />} />
        <Route path="clientes/:id" element={<ClienteFicha />} />
        <Route path="clientes/:id/visita" element={<RegistrarVisita />} />
        <Route path="orcamentos/novo" element={<OrcamentoEditor />} />
        <Route path="orcamentos/:id" element={<OrcamentoView />} />
        <Route path="orcamentos/:id/pdf" element={<OrcamentoPDF />} />
        <Route path="funil" element={<Funil />} />
        <Route path="admin" element={<Gestor><AdminDashboard /></Gestor>} />
        <Route path="admin/aprovacoes" element={<Gestor><Aprovacoes /></Gestor>} />
        <Route path="admin/representantes" element={<Gestor><Representantes /></Gestor>} />
        <Route path="admin/territorios" element={<Gestor><Territorios /></Gestor>} />
        <Route path="admin/carteira" element={<Gestor><CarteiraInterna /></Gestor>} />
        <Route path="admin/catalogo" element={<Gestor><Catalogo /></Gestor>} />
        <Route path="admin/logs" element={<Gestor><Logs /></Gestor>} />
        <Route path="admin/importar" element={<Gestor><ImportarCarteira /></Gestor>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
