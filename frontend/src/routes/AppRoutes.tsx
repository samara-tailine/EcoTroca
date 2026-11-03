import { BrowserRouter, Route, Routes } from 'react-router';
import { HomePage } from '../pages/HomePage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}