import { DashboardClient } from "./DashboardClient";

export default function Home() {
  return (
    <div className="grid items-center justify-items-center min-h-screen p-8 dark:bg-gray-950">
      <main className="flex flex-col gap-[32px] items-center">
        <h1 className="text-3xl font-bold text-center">Knowledge Hub</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 max-w-md mb-8">
          Centralized knowledge management system with AI assistance
        </p>
        
        <DashboardClient />
      </main>
    </div>
  );
}
