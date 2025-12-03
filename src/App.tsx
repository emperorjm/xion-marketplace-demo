import { Routes, Route } from 'react-router-dom';
import { ConsoleApp } from './ConsoleApp';
import { Layout } from './app/components/Layout';
import { Dashboard } from './app/pages/Dashboard';
import { Explore } from './app/pages/Explore';
import { ItemDetail } from './app/pages/ItemDetail';
import { MyItems } from './app/pages/MyItems';
import { Create } from './app/pages/Create';
import { Listings } from './app/pages/Listings';
import { Offers } from './app/pages/Offers';
import { Admin } from './app/pages/Admin';
import { Activity } from './app/pages/Activity';

export default function App() {
  return (
    <Routes>
      {/* Developer Console at root */}
      <Route path="/" element={<ConsoleApp />} />

      {/* User-facing Marketplace UI */}
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="explore" element={<Explore />} />
        <Route path="item/:tokenId" element={<ItemDetail />} />
        <Route path="my-items" element={<MyItems />} />
        <Route path="create" element={<Create />} />
        <Route path="listings" element={<Listings />} />
        <Route path="offers" element={<Offers />} />
        <Route path="admin" element={<Admin />} />
        <Route path="activity" element={<Activity />} />
      </Route>
    </Routes>
  );
}
