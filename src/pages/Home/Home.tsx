import { useState } from "react";

export const Home = () => {
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/hello");
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Vite + Hono Template</h1>
        <p className="text-xl text-muted-foreground mb-8">
          A full-stack template with React and Hono.
        </p>

        <div className="mb-12">
          <button
            onClick={testApi}
            disabled={loading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Test API"}
          </button>

          {apiResponse && (
            <pre className="mt-4 p-4 bg-muted rounded-lg text-left text-sm overflow-auto">
              {apiResponse}
            </pre>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 text-left">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">React 19</h3>
            <p className="text-muted-foreground text-sm">
              Latest React with React Router for client-side routing.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold text-lg mb-2">Hono Backend</h3>
            <p className="text-muted-foreground text-sm">
              Fast, lightweight backend with TypeScript support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
