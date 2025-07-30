import React, { useState, useEffect } from "react";
import axios from "axios";
import Chat from "./Chat";

const ChatPage = ({ user, onLogout }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [newChatUser, setNewChatUser] = useState("");
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Group chat states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupUserSearch, setGroupUserSearch] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // Profile states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    email: user.email,
    bio: "",
    phone: "",
    pic: user.pic
  });

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data } = await axios.get("/api/chat", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        // Deduplicate chats by _id on fetch
        const deduped = Array.from(new Map(data.map(chat => [chat._id, chat])).values());
        setChats(deduped);
      } catch (error) {
        console.error("Failed to load chats", error);
      }
    };
    fetchChats();
  }, [user.token]);

  // Update user status
  const updateUserStatus = async (status) => {
    try {
      await axios.put('/api/user/status', { status }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("/api/user/profile", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setProfileData({
          name: data.name,
          email: data.email,
          bio: data.bio || "",
          phone: data.phone || "",
          pic: data.pic
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    fetchProfile();
  }, [user.token]);

  // Search users for group chat
  const searchUsers = async () => {
    if (!groupUserSearch.trim()) return;
    
    try {
      const { data } = await axios.get(`/api/user?search=${groupUserSearch}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSearchResults(data);
    } catch (error) {
      console.error("Failed to search users", error);
    }
  };

  // Add user to group
  const addUserToGroup = (userToAdd) => {
    if (groupUsers.find(u => u._id === userToAdd._id)) return;
    setGroupUsers([...groupUsers, userToAdd]);
    setGroupUserSearch("");
    setSearchResults([]);
  };

  // Remove user from group
  const removeUserFromGroup = (userId) => {
    setGroupUsers(groupUsers.filter(u => u._id !== userId));
  };

  // Create group chat
  const createGroupChat = async () => {
    if (!groupName.trim() || groupUsers.length === 0) {
      alert("Please fill group name and add at least one user");
      return;
    }

    try {
      const { data } = await axios.post(
        "/api/chat/group",
        {
          name: groupName,
          users: JSON.stringify(groupUsers.map(u => u._id)),
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      setChats((prev) => {
        if (prev.some(c => c._id === data._id)) return prev;
        return [data, ...prev];
      });
      
      setSelectedChat(data);
      setShowGroupModal(false);
      setGroupName("");
      setGroupUsers([]);
    } catch (error) {
      alert("Failed to create group chat");
      console.error(error);
    }
  };

  // Update profile
  const updateProfile = async () => {
    try {
      const { data } = await axios.put(
        "/api/user/profile",
        profileData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      // Update local user data
      Object.assign(user, data);
      setShowProfileModal(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile");
      console.error(error);
    }
  };

  // Deduplicate chats by _id before rendering
  const uniqueChats = Array.from(new Map(chats.map(chat => [chat._id, chat])).values());

  // Handle chat selection and close sidebar on mobile
  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="chat-page">
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 1001,
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease'
        }}
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}

      <div className={`chat-sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <h2>Chats</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              // Search for user by email
              const { data: users } = await axios.get(`/api/user?search=${newChatUser}`, {
                headers: { Authorization: `Bearer ${user.token}` },
              });
              if (!users.length) {
                alert("User not found");
                return;
              }
              const userId = users[0]._id;
              // Create/access chat
              const { data: chat } = await axios.post(
                "/api/chat",
                { userId },
                { headers: { Authorization: `Bearer ${user.token}` } }
              );
              setChats((prev) => {
                if (prev.some(c => c._id === chat._id)) return prev;
                return [chat, ...prev];
              });
              setSelectedChat(chat);
              setNewChatUser("");
            } catch (error) {
              alert("Failed to start chat");
              console.error(error);
            }
          }}
          style={{ marginBottom: "1em" }}
        >
          <input
            type="text"
            placeholder="Enter user email to chat"
            value={newChatUser}
            onChange={(e) => setNewChatUser(e.target.value)}
            required
          />
          <button type="submit">Start Chat</button>
        </form>
        
        {/* Create Group Chat Button */}
        <button 
          onClick={() => setShowGroupModal(true)} 
          className="create-group-btn fade-in-up"
        >
          Create Group Chat
        </button>

        {/* Profile Button */}
        <button 
          onClick={() => setShowProfileModal(true)} 
          className="profile-btn fade-in-up"
        >
          My Profile
        </button>
        
        {uniqueChats.map((chat) => {
          // For one-on-one chat, find the other user
          const otherUser = chat.users && chat.users.length > 1
            ? chat.users.find(u => u._id !== user._id)
            : null;
          return (
            <div
              key={chat._id}
              onClick={() => handleChatSelect(chat)}
              className="chat-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                marginBottom: '0.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {!chat.isGroupChat && otherUser ? (
                <img
                  src={otherUser.pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                  alt={otherUser.name}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginRight: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg';
                  }}
                />
              ) : (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  fontSize: '1.2rem'
                }}>
                  👥
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                  {chat.isGroupChat
                    ? chat.chatName
                    : otherUser
                      ? otherUser.name
                      : "Chat"}
                </div>
                {!chat.isGroupChat && otherUser && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    opacity: 0.7, 
                    marginTop: '2px'
                  }}>
                    {otherUser.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <Chat user={user} currentChat={selectedChat} />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#6c757d',
            fontSize: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p>Select a chat to start messaging</p>
            <small style={{ marginTop: '0.5rem', opacity: 0.7 }}>Choose a conversation from the sidebar</small>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            minWidth: "400px",
            maxWidth: "500px"
          }}>
            <h3>Edit Profile</h3>
            
            {/* Profile Picture Display */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '2px dashed #e2e8f0'
            }}>
              {profileData.pic ? (
                <div>
                  <img
                    src={profileData.pic}
                    alt={profileData.name}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid #667eea',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                      marginBottom: '10px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{
                    display: 'none',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                    fontSize: '2rem',
                    color: '#6c757d'
                  }}>
                    👤
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>Current Profile Picture</p>
                </div>
              ) : (
                <div>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                    fontSize: '2.5rem',
                    color: '#6c757d'
                  }}>
                    👤
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>No profile picture set</p>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label>Name:</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label>Email:</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label>Bio:</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                style={{ width: "100%", padding: "8px", marginTop: "5px", minHeight: "80px" }}
                placeholder="Tell us about yourself..."
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label>Phone:</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
            
            <div style={{ marginBottom: "15px" }}>
              <label>Profile Picture URL:</label>
              <input
                type="url"
                value={profileData.pic}
                onChange={(e) => setProfileData({...profileData, pic: e.target.value})}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
            
            <div style={{ textAlign: "right" }}>
              <button 
                onClick={updateProfile}
                className="btn-primary"
              >
                Update Profile
              </button>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
      {showGroupModal && (
        <div className="modal" style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            minWidth: "300px",
            maxWidth: "500px"
          }}>
            <h3>Create Group Chat</h3>
            
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
            />
            
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                placeholder="Search users to add"
                value={groupUserSearch}
                onChange={(e) => setGroupUserSearch(e.target.value)}
                style={{ width: "70%", padding: "8px" }}
              />
              <button 
                onClick={searchUsers}
                style={{ 
                  width: "25%", 
                  marginLeft: "5%", 
                  padding: "8px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Search
              </button>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div style={{ marginBottom: "10px", maxHeight: "100px", overflowY: "auto" }}>
                {searchResults.map((user) => (
                  <div 
                    key={user._id}
                    onClick={() => addUserToGroup(user)}
                    style={{ 
                      padding: "5px", 
                      cursor: "pointer",
                      borderBottom: "1px solid #eee"
                    }}
                  >
                    {user.name} ({user.email})
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Users */}
            {groupUsers.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <h4>Selected Users:</h4>
                {groupUsers.map((user) => (
                  <div 
                    key={user._id}
                    style={{ 
                      display: "inline-block",
                      margin: "2px",
                      padding: "4px 8px",
                      backgroundColor: "#e9ecef",
                      borderRadius: "4px"
                    }}
                  >
                    {user.name}
                    <button 
                      onClick={() => removeUserFromGroup(user._id)}
                      style={{ 
                        marginLeft: "5px",
                        border: "none",
                        backgroundColor: "red",
                        color: "white",
                        borderRadius: "50%",
                        width: "16px",
                        height: "16px",
                        cursor: "pointer"
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ textAlign: "right" }}>
              <button 
                onClick={createGroupChat}
                className="btn-primary"
              >
                Create Group
              </button>
              <button 
                onClick={() => {
                  setShowGroupModal(false);
                  setGroupName("");
                  setGroupUsers([]);
                  setGroupUserSearch("");
                  setSearchResults([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
