import { QuizProvider } from './context/QuizContext';
import DashboardPage from './pages/Dashboard';

export default function App() {
  return (
    <QuizProvider>
      <DashboardPage />
    </QuizProvider>
  );
}
