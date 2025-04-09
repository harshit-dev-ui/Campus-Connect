import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import {
  searchUsers,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
} from "../utils/profileService";
import SearchIcon from "@mui/icons-material/Search";
import AccountCircle from "@mui/icons-material/AccountCircle";
import MailIcon from "@mui/icons-material/Mail";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MoreIcon from "@mui/icons-material/MoreVert";
import axios from "axios";
import SearchResultItem from "./SearchResultItem";
import { toast } from "react-hot-toast";
import { searchPublicGroups } from "../utils/groupService";
const socket = io("https://campus-connect-1-7rgs.onrender.com", { withCredentials: true });

const apiClient = axios.create({
  baseURL: "https://campus-connect-1-7rgs.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

function useAuthStatus() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await apiClient.get("/auth/dashboard");

        if (response?.data?.user && !response?.data?.error) {
          setIsLoggedIn(true);
          setUser(response.data.user);
          // Store user data in localStorage
          localStorage.setItem("user", JSON.stringify(response.data.user));
        } else {
          setIsLoggedIn(false);
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("Auth Error:", error);
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("user");
      }
      setLoading(false);
    }

    // Try to get user from localStorage first
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoggedIn(true);
    }

    checkAuth();
  }, []);

  return { loading, isLoggedIn, user };
}

const Header = () => {
  const navigateTo = useNavigate();
  const { loading, isLoggedIn, user } = useAuthStatus();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("users"); // 'users' or 'groups'
  const [searchResults, setSearchResults] = useState({ users: [], groups: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
  const [friendRequests, setFriendRequests] = useState({
    sentRequests: [],
    receivedRequests: [],
  });
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false);
  const [isMentorDropdownOpen, setIsMentorDropdownOpen] = useState(false);
  const [isMenuHovered, setIsMenuHovered] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);

  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);
  const profileMenuRef = useRef(null);

  //notification using socket
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("user-online", user._id);

    socket.on("receive-notification", (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      toast.success(notification.message);
    });

    return () => {
      socket.off("receive-notification");
    };
  }, [socket, user]);
  //closing of dorpdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        handleMenuClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  useEffect(() => {
    const fetchFriendRequests = async () => {
      try {
        const requests = await getFriendRequests();
        setFriendRequests(requests);
      } catch (error) {
        console.error("Failed to fetch friend requests:", error);
      }
    };

    if (isLoggedIn) {
      fetchFriendRequests();
    }
  }, [isLoggedIn]);

  const handleAddTag = (e) => {
    if (
      (e.key === "Enter" || e.type === "blur") &&
      tagInput &&
      !tags.includes(tagInput)
    ) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSearch = async () => {
    if (!query && tags.length === 0) return;
    try {
      if (searchType === "users") {
        const userData = await searchUsers(query);
        setSearchResults({ ...searchResults, users: userData });
      } else {
        // Pass both query and tags to search function
        const groupData = await searchPublicGroups(
          query || "",
          tags.length > 0 ? tags.join(",") : ""
        );
        setSearchResults({ ...searchResults, groups: groupData });
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  // Add effect to trigger search when tags change
  useEffect(() => {
    if (searchType === "groups") {
      handleSearch();
    }
  }, [tags]); // Add this effect

  const handleLogout = async () => {
    try {
      await axios.post(
        "https://campus-connect-1-7rgs.onrender.com/auth/api/auth/logout",
        {},
        { withCredentials: true }
      );
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  const handleNotificationClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId);
      setFriendRequests((prev) => ({
        ...prev,
        receivedRequests: prev.receivedRequests.filter(
          (req) => req._id !== requestId
        ),
      }));
      toast.success("Friend request accepted!");
    } catch (error) {
      toast.error(error.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId);
      setFriendRequests((prev) => ({
        ...prev,
        receivedRequests: prev.receivedRequests.filter(
          (req) => req._id !== requestId
        ),
      }));
      toast.success("Friend request rejected");
    } catch (error) {
      toast.error(error.message || "Failed to reject request");
    }
  };

  const renderNotificationsDropdown = () => (
    <div
      className={`absolute right-0 mt-2 w-80 bg-gray-900 text-gray-200 shadow-2xl rounded-md z-20 ${notificationDropdownOpen ? "animate-fadeIn" : "hidden"
        }`}
    >
      <div className="p-4">
        <h3 className="font-bold mb-3 text-gray-100">Friend Requests</h3>
        {friendRequests.receivedRequests.length > 0 ? (
          friendRequests.receivedRequests.map((request) => (
            <div
              key={request._id}
              className="flex items-center justify-between p-2 border-b border-gray-700"
            >
              <span>{request.username}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptRequest(request._id)}
                  className="bg-indigo-600 hover:bg-indigo-700 transition-all duration-300 text-white px-2 py-1 rounded"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(request._id)}
                  className="bg-red-600 hover:bg-red-700 transition-all duration-300 text-white px-2 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No pending friend requests</p>
        )}
      </div>
    </div>
  );

  const menuId = "primary-search-account-menu";
  const renderMenu = (
    <div
      ref={profileMenuRef}
      className={`absolute right-0 mt-2 w-48 bg-gray-900 shadow-xl rounded-lg z-10 backdrop-blur-lg border border-gray-800 ${isMenuOpen ? "animate-slideDown" : "hidden"
        }`}
    >
      <div
        className="p-2 hover:bg-gray-800 cursor-pointer block text-gray-300 transition-all duration-300 first:rounded-t-lg"
        onClick={() => {
          console.log("Profile clicked, user:", user);
          if (!user?._id) {
            console.error("User ID not available");
            return;
          }
          navigateTo(`/userProfile/${user._id}`);
        }}
      >
        Profile
      </div>
      <div
        className="p-2 hover:bg-gray-800 cursor-pointer text-gray-300 transition-all duration-300"
        onClick={handleLogout}
      >
        Logout
      </div>
      <div
        className="p-2 hover:bg-gray-800 cursor-pointer text-gray-300 transition-all duration-300 last:rounded-b-lg"
        onClick={() => {
          window.location.href = "/admin/login";
        }}
      >
        Admin Login
      </div>
    </div>
  );

  const mobileMenuId = "primary-search-account-menu-mobile";
  const renderMobileMenu = (
    <div
      className={`absolute right-0 mt-2 w-48 bg-gray-900 shadow-xl rounded-lg z-10 ${isMobileMenuOpen ? "animate-slideDown" : "hidden"
        }`}
    >
      <div className="p-2 flex items-center text-gray-300 hover:bg-gray-800 transition-all duration-300">
        <MailIcon className="text-gray-400" />
        <span className="ml-2">Messages</span>
      </div>
      <div className="p-2 flex items-center text-gray-300 hover:bg-gray-800 transition-all duration-300">
        <NotificationsIcon className="text-gray-400" />
        <span className="ml-2">Notifications</span>
      </div>
      <div className="p-2 flex items-center text-gray-300 hover:bg-gray-800 transition-all duration-300" onClick={handleProfileMenuOpen}>
        <AccountCircle className="text-gray-400" />
        <span className="ml-2">Profile</span>
      </div>
      <div
        className="p-2 flex items-center text-gray-300 hover:bg-gray-800 transition-all duration-300"
        onClick={() => {
          window.location.href = "/admin/login";
        }}
      >
        <AccountCircle className="text-gray-400" />
        <span className="ml-2">Admin</span>
      </div>
      <div
        className="p-2 hover:bg-gray-800 text-gray-300 cursor-pointer transition-all duration-300"
        onClick={handleLogout}
      >
        Logout
      </div>
    </div>
  );

  const renderSearchBar = () => (
    <div
      className={`transition-all duration-300 ${searchOpen
        ? "fixed top-4 left-1/2 transform -translate-x-1/2 w-2/3 max-w-lg z-50"
        : "w-40"
        }`}
    >
      <div className="flex flex-col bg-gray-900 text-gray-200 rounded-lg shadow-xl border border-gray-800 backdrop-blur-lg">
        <div className="flex items-center px-4 py-2">
          <SearchIcon className="text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${searchType}...`}
            className="ml-2 outline-none w-full bg-transparent text-gray-200 placeholder-gray-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={() => setSearchOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchOpen && (
            <button
              className="text-gray-500 hover:text-gray-300 transition-colors duration-300"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                setTags([]);
              }}
            >
              ✕
            </button>
          )}
        </div>
        {searchOpen && (
          <>
            <div className="px-4 py-2 border-t border-gray-800">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="searchType"
                  value="users"
                  checked={searchType === "users"}
                  onChange={(e) => {
                    setSearchType(e.target.value);
                    setTags([]);
                  }}
                  className="accent-indigo-600"
                />
                <span>Users</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="searchType"
                  value="groups"
                  checked={searchType === "groups"}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="accent-indigo-600"
                />
                <span>Groups</span>
              </label>
            </div>

            {/* Add tags input for group search */}
            {searchType === "groups" && (
              <div className="px-4 py-2 border-t border-gray-800">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-indigo-900 text-indigo-200 px-2 py-1 rounded-full text-sm flex items-center"
                    >
                      #{tag}
                      <button
                        className="ml-1 text-indigo-300 hover:text-indigo-100 transition-colors duration-300"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tags (press Enter)"
                  className="w-full p-2 border border-gray-700 rounded bg-gray-800 text-gray-200 placeholder-gray-500"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  onBlur={handleAddTag}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Search Results Dropdown */}
      {searchOpen && (query || tags.length > 0) && (
        <div className="absolute w-full bg-gray-900 text-gray-200 p-4 shadow-xl rounded-md mt-2 border border-gray-800 backdrop-blur-lg">
          {searchType === "users" && searchResults.users.length > 0 ? (
            searchResults.users.map((user) => (
              <SearchResultItem
                key={user._id}
                user={user}
                onClick={() => setSearchOpen(false)}
              />
            ))
          ) : searchType === "groups" && searchResults.groups.length > 0 ? (
            searchResults.groups.map((group) => (
              <div
                key={group._id}
                className="flex items-center p-2 hover:bg-gray-800 cursor-pointer transition-all duration-300 rounded"
                onClick={() => {
                  navigateTo(`/groupDetails/${group._id}`);
                  setSearchOpen(false);
                }}
              >
                <img
                  src={group.avatar || "/default-group.png"}
                  alt={group.name}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-gray-400">
                    {group.tags.map((tag, index) => (
                      <span key={index} className="mr-2">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="p-2 text-gray-400">No results found</p>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <header className="flex justify-between items-center p-4 bg-gray-900 shadow-md">
        <div className="flex items-center">
          <div className="w-32 h-8 bg-gray-800 animate-pulse"></div>
        </div>
        <div className="flex items-center">
          <div className="w-24 h-10 bg-gray-800 animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes borderPulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes typewriter {
          from { width: 0; }
          to { width: 210px; }
        }
        @keyframes blinkCursor {
          from, to { border-right-color: transparent; }
          50% { border-right-color: #6366f1; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.3s forwards;
        }
        .nav-item {
          position: relative;
          transition: all 0.3s;
        }
        .nav-item::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -2px;
          left: 50%;
          background-color: #6366f1;
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        .nav-item:hover::after,
        .nav-item.active::after {
          width: 100%;
        }
        .logo-pulse {
          animation: pulse 3s infinite;
          animation-delay: 3.5s;
          position: relative;
        }
        .ascii-logo-container {
          position: relative;
          display: inline-block;
          overflow: hidden;
          transform: scale(0.8);
          transform-origin: left center;
        }
        .ascii-art {
          font-family: monospace;
          white-space: pre;
          font-size: 6px;
          line-height: 1;
          color: #6366f1;
          letter-spacing: 0;
        }
        
        .typewriter-container {
          display: inline-block;
          border-right: 2px solid #6366f1;
          overflow: hidden;
          white-space: nowrap;
          width: 0;
          animation: 
            typewriter 2.5s steps(40, end) 0.5s forwards,
            blinkCursor 0.75s step-end infinite;
        }
        
        .typewriter-container.active {
          animation: 
            typewriter 2.5s steps(40, end) 0.5s forwards,
            blinkCursor 0.75s step-end infinite;
        }
        
        .nav-container {
          background: linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(8,8,14,1) 50%, rgba(0,0,0,1) 100%);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
        }
        
        .ascii-art:hover {
          color: #818cf8;
          text-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
        }
      `}</style>
      <header className="nav-container text-gray-200 shadow-lg">
        <div className="container mx-auto flex justify-between items-center p-4">
          <div className="flex items-center">
            <div className="mr-4 logo-pulse relative group">
              <div className="ascii-logo-container">
                <div className="typewriter-container active">
                  <pre className="ascii-art text-xs">
                    {`██╗  ██╗██╗   ██╗██████╗  ███████╗████████╗███████╗██████╗ 
██║  ██║██║   ██║██╔══██╗ ██╔════╝╚══██╔══╝██╔════╝██╔══██╗
███████║██║   ██║██████╔╝ ███████╗   ██║   █████╗  ██████╔╝
██╔══██║██║   ██║██╔══██╗ ╚════██║   ██║   ██╔══╝  ██╔══██╗
██║  ██║╚██████╔╝██████╔╝ ███████║   ██║   ███████╗██║  ██║
╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝`}
                  </pre>
                </div>
              </div>
              <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>
          <nav
            className="hidden md:block"
            onMouseEnter={() => setIsMenuHovered(true)}
            onMouseLeave={() => setIsMenuHovered(false)}
          >
            <ul className="flex items-center space-x-8">
              <li className="nav-item">
                <Link
                  to="/dashboard"
                  className={`font-medium transition-all duration-300 hover:text-white ${activeMenuItem === 'dashboard' ? 'text-white active' : 'text-gray-300'}`}
                  onMouseEnter={() => setActiveMenuItem('dashboard')}
                  onMouseLeave={() => setActiveMenuItem(null)}
                >
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/doubts"
                  className={`font-medium transition-all duration-300 hover:text-white ${activeMenuItem === 'doubts' ? 'text-white active' : 'text-gray-300'}`}
                  onMouseEnter={() => setActiveMenuItem('doubts')}
                  onMouseLeave={() => setActiveMenuItem(null)}
                >
                  Discussion
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/room"
                  className={`font-medium transition-all duration-300 hover:text-white ${activeMenuItem === 'room' ? 'text-white active' : 'text-gray-300'}`}
                  onMouseEnter={() => setActiveMenuItem('room')}
                  onMouseLeave={() => setActiveMenuItem(null)}
                >
                  Rooms
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  to="/chats"
                  className={`font-medium transition-all duration-300 hover:text-white ${activeMenuItem === 'chats' ? 'text-white active' : 'text-gray-300'}`}
                  onMouseEnter={() => setActiveMenuItem('chats')}
                  onMouseLeave={() => setActiveMenuItem(null)}
                >
                  Chats
                </Link>
              </li>
              <li className="nav-item relative"
                onMouseEnter={() => {
                  setActiveMenuItem('mentors');
                  setIsMentorDropdownOpen(true);
                }}
                onMouseLeave={() => {
                  
                  setActiveMenuItem(null);
                  setIsMentorDropdownOpen(false);

                }}
              >
                <span className={`font-medium transition-all duration-300 hover:text-white cursor-pointer ${activeMenuItem === 'mentors' ? 'text-white active' : 'text-gray-300'}`}>
                  Mentors
                </span>
                {isMentorDropdownOpen && (
                  <ul className="absolute top-full left-1/2 transform -translate-x-1/2 mt-0.5 bg-gray-900 rounded-lg shadow-2xl animate-fadeIn border border-gray-800 backdrop-blur-lg min-w-[160px] z-20"
                  >
                    <li className="px-4 py-2 hover:bg-gray-800 transition-all duration-300 rounded-t-lg"
                    >
                      <Link  to="/mentors" className="block w-full text-gray-300 hover:text-white">
                        Find Mentors
                      </Link>
                    </li>
                    <li className="px-4 py-2 hover:bg-gray-800 transition-all duration-300 rounded-b-lg">
                      <Link to="/mentor-application" className="block w-full text-gray-300 hover:text-white">
                        Apply as Mentor
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
              <li className="nav-item">
                <Link
                  to="/marketplace"
                  className={`font-medium transition-all duration-300 hover:text-white ${activeMenuItem === 'market' ? 'text-white active' : 'text-gray-300'}`}
                  onMouseEnter={() => setActiveMenuItem('market')}
                  onMouseLeave={() => setActiveMenuItem(null)}
                >
                  Market
                </Link>
              </li>
            </ul>
          </nav>
          <div className="flex items-center space-x-4">
            {/* Blurred Overlay when search is active */}
            {searchOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-all duration-300 z-40"
                onClick={() => setSearchOpen(false)}
              ></div>
            )}

            {/* Search Bar */}
            {renderSearchBar()}

            <div className="relative">
              <button
                className="relative p-2 rounded-full hover:bg-gray-800 transition-all duration-300"
                onClick={handleNotificationClick}
              >
                <NotificationsIcon className="text-gray-300" />
                {friendRequests.receivedRequests.length > 0 && (
                  <span className="absolute top-0 right-0 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {friendRequests.receivedRequests.length}
                  </span>
                )}
              </button>
              {renderNotificationsDropdown()}
            </div>
            <button
              onClick={handleProfileMenuOpen}
              className="p-2 rounded-full hover:bg-gray-800 transition-all duration-300"
            >
              <AccountCircle className="text-gray-300" />
            </button>
            <button
              onClick={handleMobileMenuOpen}
              className="block md:hidden p-2 rounded-full hover:bg-gray-800 transition-all duration-300"
            >
              <MoreIcon className="text-gray-300" />
            </button>
          </div>
        </div>
        {renderMobileMenu}
        {renderMenu}
      </header>
    </>
  );
};

export default Header;
