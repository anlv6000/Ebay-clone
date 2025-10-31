import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { MdClose } from "react-icons/md";
import { HiMenuAlt2 } from "react-icons/hi";
import { motion } from "framer-motion";
import { logo, logoLight } from "../../../assets/images";
import Image from "../../designLayouts/Image";
import { navBarList } from "../../../constants";
import Flex from "../../designLayouts/Flex";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../../features/auth/authSlice";

const Header = () => {
  const [showMenu, setShowMenu] = useState(true);
  const [sidenav, setSidenav] = useState(false);
  const [category, setCategory] = useState(false);
  const [brand, setBrand] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get user info from Redux store
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  // Handle responsive menu
  useEffect(() => {
    let ResponsiveMenu = () => {
      if (window.innerWidth < 667) {
        setShowMenu(false);
      } else {
        setShowMenu(true);
      }
    };
    ResponsiveMenu();
    window.addEventListener("resize", ResponsiveMenu);
    
    // Add scroll event listener
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener("resize", ResponsiveMenu);
      window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
    setSidenav(false);
    navigate('/signin');
  };

  // Navigate to store registration
  const handleBecomeASeller = () => {
    navigate('/store-registration');
    setSidenav(false);
  };

  // Handle navigation based on user role
  const handleNavigation = (link, title) => {
    // If user is a seller and they click on Shop, redirect to /overview
    if (isAuthenticated && user.role === 'seller' && title === 'Shop') {
      navigate('/overview');
      setSidenav(false);
    } else {
      navigate(link);
      setSidenav(false);
    }
  };

  return (
    <div className={`w-full h-20 sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white'} border-b-[1px] border-b-gray-200`}>
      <nav className="h-full px-4 max-w-container mx-auto relative">
        <Flex className="flex items-center justify-between h-full">
          <Link to="/">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <Image className="w-32 object-cover" imgSrc={logo} />
            </div>
          </Link>
          <div>
            {showMenu && (
              <motion.ul
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex items-center w-auto z-50 p-0 gap-2"
              >
                <>
                  {navBarList.map(({ _id, title, link }) => (
                    <NavLink
                      key={_id}
                      className={({ isActive }) => 
                        `flex font-normal hover:font-bold w-20 h-6 justify-center items-center px-12 text-base ${isActive ? 'text-[#0F52BA] font-bold' : 'text-[#767676]'} hover:text-[#0F52BA] hover:underline underline-offset-[4px] decoration-[1px] md:border-r-[2px] border-r-gray-300 hoverEffect last:border-r-0 transition-colors`}
                      onClick={(e) => {
                        if (isAuthenticated && user.role === 'seller' && title === 'Shop') {
                          e.preventDefault();
                          navigate('/overview');
                        }
                      }}
                      to={link}
                      state={{ data: location.pathname.split("/")[1] }}
                    >
                      <li>{title}</li>
                    </NavLink>
                  ))}
                  
                  {/* User info display */}
                  {isAuthenticated ? (
                    <div className="flex items-center ml-4 space-x-4">
                      <span className="text-[#262626] font-medium">
                        Hello, {user.username}
                      </span>
                      {/* Show "Become a Seller" button only for buyers */}
                      {user.role === 'buyer' && (
                        <button 
                          onClick={handleBecomeASeller}
                          className="border border-[#0F52BA] text-[#0F52BA] px-4 py-1 rounded hover:bg-[#0F52BA] hover:text-white transition-colors duration-300"
                        >
                          Become a Seller
                        </button>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="bg-[#0F52BA] text-white px-4 py-1 rounded hover:bg-[#0A3C8A] transition-colors duration-300 shadow-md hover:shadow-lg"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center ml-4 space-x-4">
                      <Link to="/signin">
                        <button className="bg-[#0F52BA] text-white px-4 py-1 rounded hover:bg-[#0A3C8A] transition-colors duration-300 shadow-md hover:shadow-lg">
                          Sign In
                        </button>
                      </Link>
                      <Link to="/signup">
                        <button className="border border-[#0F52BA] text-[#0F52BA] px-4 py-1 rounded hover:bg-[#0F52BA] hover:text-white transition-colors duration-300">
                          Sign Up
                        </button>
                      </Link>
                    </div>
                  )}
                </>
              </motion.ul>
            )}
            <HiMenuAlt2
              onClick={() => setSidenav(!sidenav)}
              className="inline-block md:hidden cursor-pointer w-8 h-6 absolute top-6 right-4 text-[#0F52BA]"
            />
            {sidenav && (
              <div className="fixed top-0 left-0 w-full h-screen bg-black text-gray-200 bg-opacity-80 z-50">
                <motion.div
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-[80%] h-full relative"
                >
                  <div className="w-full h-full bg-[#0F52BA] p-6">
                    <img
                      className="w-28 mb-6"
                      src={logoLight}
                      alt="logoLight"
                    />
                    <ul className="text-gray-200 flex flex-col gap-2">
                      {navBarList.map((item) => (
                        <li
                          className="font-normal hover:font-bold items-center text-lg text-gray-200 hover:underline underline-offset-[4px] decoration-[1px] hover:text-white md:border-r-[2px] border-r-gray-300 hoverEffect last:border-r-0"
                          key={item._id}
                        >
                          <NavLink
                            to={item.link}
                            state={{ data: location.pathname.split("/")[1] }}
                            onClick={(e) => {
                              if (isAuthenticated && user.role === 'seller' && item.title === 'Shop') {
                                e.preventDefault();
                                navigate('/overview');
                                setSidenav(false);
                              } else {
                                setSidenav(false);
                              }
                            }}
                          >
                            {item.title}
                          </NavLink>
                        </li>
                      ))}
                      
                      {/* User section in mobile menu */}
                      {isAuthenticated ? (
                        <>
                          <li className="font-bold text-lg text-white mt-4">
                            Hello, {user.username}
                          </li>
                          {/* Show "Become a Seller" option only for buyers */}
                          {user.role === 'buyer' && (
                            <li className="font-normal hover:font-bold items-center text-lg text-gray-200 hover:underline underline-offset-[4px] decoration-[1px] hover:text-white">
                              <button 
                                onClick={handleBecomeASeller}
                                className="w-full text-left"
                              >
                                Become a Seller
                              </button>
                            </li>
                          )}
                          <li className="font-normal hover:font-bold items-center text-lg text-gray-200 hover:underline underline-offset-[4px] decoration-[1px] hover:text-white">
                            <button 
                              onClick={handleLogout}
                              className="w-full text-left"
                            >
                              Logout
                            </button>
                          </li>
                        </>
                      ) : (
                        <li className="font-normal hover:font-bold items-center text-lg text-gray-200 hover:underline underline-offset-[4px] decoration-[1px] hover:text-white">
                          <NavLink
                            to="/signin"
                            onClick={() => setSidenav(false)}
                          >
                            Sign In
                          </NavLink>
                        </li>
                      )}
                    </ul>
                    <div className="mt-4">
                      <h1
                        onClick={() => setCategory(!category)}
                        className="flex justify-between text-base cursor-pointer items-center font-titleFont mb-2"
                      >
                        Shop by Category{" "}
                        <span className="text-lg">{category ? "-" : "+"}</span>
                      </h1>
                      {category && (
                        <motion.ul
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                          className="text-sm flex flex-col gap-1"
                        >
                          <li className="headerSedenavLi">New Arrivals</li>
                          <li className="headerSedenavLi">Gadgets</li>
                          <li className="headerSedenavLi">Accessories</li>
                          <li className="headerSedenavLi">Electronics</li>
                          <li className="headerSedenavLi">Others</li>
                        </motion.ul>
                      )}
                    </div>
                    <div className="mt-4">
                      <h1
                        onClick={() => setBrand(!brand)}
                        className="flex justify-between text-base cursor-pointer items-center font-titleFont mb-2"
                      >
                        Shop by Brand
                        <span className="text-lg">{brand ? "-" : "+"}</span>
                      </h1>
                      {brand && (
                        <motion.ul
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                          className="text-sm flex flex-col gap-1"
                        >
                          <li className="headerSedenavLi">Apple</li>
                          <li className="headerSedenavLi">Samsung</li>
                          <li className="headerSedenavLi">Sony</li>
                          <li className="headerSedenavLi">Dell</li>
                          <li className="headerSedenavLi">Others</li>
                        </motion.ul>
                      )}
                    </div>
                  </div>
                  <span
                    onClick={() => setSidenav(false)}
                    className="w-8 h-8 border-[1px] border-gray-300 absolute top-2 -right-10 text-gray-300 text-2xl flex justify-center items-center cursor-pointer hover:border-red-500 hover:text-red-500 duration-300"
                  >
                    <MdClose />
                  </span>
                </motion.div>
              </div>
            )}
          </div>
        </Flex>
      </nav>
    </div>
  );
};

export default Header;