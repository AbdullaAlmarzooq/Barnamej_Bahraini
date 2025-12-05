import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Attractions from './pages/Attractions';
import Reviews from './pages/Reviews';
import Itineraries from './pages/Itineraries';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attractions" element={<Attractions />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/itineraries" element={<Itineraries />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
