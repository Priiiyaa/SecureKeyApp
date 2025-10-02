// App.jsx
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      {/* Toaster component with optional custom configuration */}
      <Toaster 
        position="top-right"
        toastOptions={{
          // Default options for all toasts
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Custom styles for specific toast types
          success: {
            duration: 3000,
            style: {
              background: 'green',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: 'red',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />


        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;