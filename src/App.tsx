import { Navigate, Route, Routes } from 'react-router-dom';
import { CollectionsPage } from '@/components/collections/CollectionsPage';
import { BloggerSlotPage } from '@/components/collections/BloggerSlotPage';
import { DevSimulator } from '@/components/dev/DevSimulator';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/collections" replace />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:collectionId/slots/:slotId" element={<BloggerSlotPage />} />
      </Routes>
      <DevSimulator />
    </>
  );
}

export default App;
