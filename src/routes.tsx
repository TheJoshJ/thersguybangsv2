import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { Home } from "./pages/Home/Home";

export const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <Layout>
          <Home />
        </Layout>
      }
    />

    {/* Add more routes here */}

    {/* 404 fallback */}
    <Route
      path="*"
      element={
        <Layout>
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground">Page not found</p>
            </div>
          </div>
        </Layout>
      }
    />
  </Routes>
);
