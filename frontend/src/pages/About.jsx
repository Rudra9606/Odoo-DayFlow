import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-primary-500">
              WorkZen
            </Link>
            <div className="flex space-x-8">
              <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <Link to="/about" className="hover:text-primary-500 transition-colors">About</Link>
              <Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 gradient-text">About WorkZen HRMS</h1>
          <p className="text-xl text-gray-400 mb-8">
            WorkZen HRMS is designed to transform HR operations for modern Indian businesses.
          </p>
          <div className="space-y-4 text-gray-300">
            <p>
              This page is a placeholder for future content about WorkZen HRMS, its mission, vision, and team.
            </p>
            <p>
              Coming soon: Company history, team profiles, values, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
