import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import ClienteNovo from './pages/ClienteNovo'
import ClienteFicha from './pages/ClienteFicha'
import ClienteEditar from './pages/ClienteEditar'
import RegistrarVisita from './pages/RegistrarVisita'
import OrcamentoEditor from './pages/OrcamentoEditor'
import OrcamentoView from './pages/OrcamentoView'
import OrcamentoPDF from './pages/OrcamentoPDF'
import OrcamentoImagem from './pages/OrcamentoImagem'
import Funil from './pages/Funil'
import Prospeccao from './pages/Prospeccao'
import AdminDashboard from './pages/admin/AdminDashboard'
import Aprovacoes from './pages/admin/Aprovacoes'
import MetasRanking from './pages/admin/MetasRanking'
import Representantes from './pages/admin/Representantes'
import Territorios from './pages/admin/Territorios'
import CarteiraInterna from './pages/admin/CarteiraInterna'
import Catalogo from './pages/admin/Catalogo'
import CondicoesPagamento from './pages/admin/CondicoesPagamento'
import DadosEmpresa from './pages/admin/DadosEmpresa'
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

function Home() {
  const { isGestor } = useAuth()
  return isGestor ? <AdminDashboard /> : <Dashboard />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Home />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/novo" element={<ClienteNovo />} />
        <Route path="clientes/:id" element={<ClienteFicha />} />
        <Route path="clientes/:id/editar" element={<ClienteEditar />} />
        <Route path="clientes/:id/visita" element={<RegistrarVisita />} />
        <Route path="orcamentos/novo" element={<OrcamentoEditor />} />
        <Route path="orcamentos/:id" element={<OrcamentoView />} />
        <Route path="orcamentos/:id/pdf" element={<OrcamentoPDF />} />
        <Route path="orcamentos/:id/imagem" element={<OrcamentoImagem />} />
        <Route path="funil" element={<Funil />} />
        <Route path="prospeccao" element={<Prospeccao />} />
        <Route path="admin" element={<Gestor><AdminDashboard /></Gestor>} />
        <Route path="admin/aprovacoes" element={<Gestor><Aprovacoes /></Gestor>} />
        <Route path="admin/metas" element={<Gestor><MetasRanking /></Gestor>} />
        <Route path="admin/representantes" element={<Gestor><Representantes /></Gestor>} />
        <Route path="admin/territorios" element={<Gestor><Territorios /></Gestor>} />
        <Route path="admin/carteira" element={<Gestor><CarteiraInterna /></Gestor>} />
        <Route path="admin/catalogo" element={<Gestor><Catalogo /></Gestor>} />
        <Route path="admin/condicoes" element={<Gestor><CondicoesPagamento /></Gestor>} />
        <Route path="admin/empresa" element={<Gestor><DadosEmpresa /></Gestor>} />
        <Route path="admin/logs" element={<Gestor><Logs /></Gestor>} />
        <Route path="admin/importar" element={<Gestor><ImportarCarteira /></Gestor>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
