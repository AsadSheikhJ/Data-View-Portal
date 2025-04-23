import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user }) => {
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
          <li>
            <Link to="/admin/users" className="nav-link">
              User Management
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;