import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav>
      <ul>
        <li>
          <Link to="/" className="nav-link">
            Home
          </Link>
        </li>
        <li>
          <Link to="/about" className="nav-link">
            About
          </Link>
        </li>
        {user?.role === 'admin' && (
          <>
            <li>
              <Link to="/admin/users" className="nav-link">
                User Management
              </Link>
            </li>
            <li>
              <Link to="/admin/groups" className="nav-link">
                Group Management
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;