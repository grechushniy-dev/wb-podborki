import { Navigate, Route, Routes } from 'react-router-dom';
import { CollectionsPage } from '@/components/collections/CollectionsPage';
import { BloggerSlotPage } from '@/components/collections/BloggerSlotPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/collections" replace />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:collectionId/slots/:slotId" element={<BloggerSlotPage />} />
    </Routes>
  );
}

export default App;
