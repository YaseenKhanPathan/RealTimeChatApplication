import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const ENDPOINT = "http://localhost:5000"; // or your backend URL

const Chat = ({ user, currentChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const typingTimeoutRef = useRef();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messageInputRef = useRef();
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const messageRefs = useRef({});
  const socket = useRef();
  
  // Add members to group states
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);

  useEffect(() => {
    socket.current = io(ENDPOINT);
    socket.current.emit('setup', user);
    socket.current.on('connected', () => setSocketConnected(true));
    socket.current.on('message received', (newMsg) => {
      setMessages((prev) => {
        const updatedMessages = [...prev, newMsg];
        // If this is a new message from another user and we're actively viewing the chat,
        // mark it as read immediately and emit read receipt
        if (newMsg.sender._id !== user._id) {
          setTimeout(() => {
            markMessageAsReadRealTime(newMsg._id);
          }, 100);
          const messageWithRead = {
            ...newMsg,
            readBy: [...(newMsg.readBy || []), { _id: user._id, name: user.name }]
          };
          return prev.map(msg => msg._id === newMsg._id ? messageWithRead : msg);
        }
        return updatedMessages;
      });
    });
    socket.current.on('message deleted', (data) => {
      setMessages((prev) => prev.filter(msg => msg._id !== data.messageId));
    });
    socket.current.on('message read', (data) => {
      setMessages((prev) => 
        prev.map(msg => 
          msg._id === data.messageId 
            ? { 
                ...msg, 
                readBy: [...(msg.readBy || []), data.readBy]
              }
            : msg
        )
      );
    });
    socket.current.on('typing', () => setIsTyping(true));
    socket.current.on('stop typing', () => setIsTyping(false));
    socket.current.on('user status update', (data) => {
      if (chatUser && data.userId === chatUser._id) {
        setChatUser(prev => ({ ...prev, status: data.status }));
      }
    });

    // Set user as online
    updateUserStatus('online');

    // Cleanup on unmount
    return () => {
      updateUserStatus('offline');
      socket.current.disconnect();
    };
  }, []);

  // Update user status
  const updateUserStatus = async (status) => {
    try {
      await axios.put('/api/user/status', { status }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      socket.current.emit('user status', { userId: user._id, status });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Join chat room when currentChat changes
  useEffect(() => {
    if (currentChat && socket.current) {
      socket.current.emit('join chat', currentChat._id);
    }
  }, [currentChat]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await axios.get(`/api/message/${currentChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setMessages(data);
      
      // Mark all unread messages in this chat as read
      try {
        const response = await axios.put(`/api/message/${currentChat._id}/read`, {}, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        
        // Update messages to show they're read
        const updatedMessages = data.map(msg => {
          if (msg.sender._id !== user._id && (!msg.readBy || !msg.readBy.some(reader => reader._id === user._id))) {
            // Emit read receipt for this message
            socket.current.emit('message read', {
              messageId: msg._id,
              chat: currentChat,
              readBy: user,
            });
            
            return {
              ...msg,
              readBy: [...(msg.readBy || []), { _id: user._id, name: user.name }]
            };
          }
          return msg;
        });
        setMessages(updatedMessages);
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
      }
    };
    fetchMessages();
  }, [currentChat, user.token]);

  // Get chat user info for one-on-one chats
  useEffect(() => {
    if (currentChat && !currentChat.isGroupChat) {
      const otherUser = currentChat.users.find(u => u._id !== user._id);
      if (otherUser) {
        setChatUser(otherUser);
      }
    }
  }, [currentChat, user._id]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    try {
      let messageData = {
        chatId: currentChat._id,
      };

      if (selectedFile) {
        // For file upload, you would typically upload to a service like AWS S3
        // For now, we'll simulate with a local file URL
        messageData = {
          ...messageData,
          messageType: 'file',
          fileUrl: URL.createObjectURL(selectedFile),
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        };
        setSelectedFile(null);
      } else {
        messageData = {
          ...messageData,
          content: newMessage,
          messageType: 'text',
        };
      }

      const { data } = await axios.post(
        '/api/message',
        messageData,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      // Add the new message with initial readBy as empty array
      const messageWithReadStatus = {
        ...data,
        readBy: []
      };
      
      setMessages([...messages, messageWithReadStatus]);
      setNewMessage('');
      socket.current.emit('new message', data);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await axios.delete(`/api/message/message/${messageId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      setMessages((prev) => prev.filter(msg => msg._id !== messageId));
      socket.current.emit('message deleted', {
        messageId,
        chat: currentChat,
        sender: user,
      });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.put(`/api/message/message/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      socket.current.emit('message read', {
        messageId,
        chat: currentChat,
        readBy: user,
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const markMessageAsReadRealTime = async (messageId) => {
    try {
      // Mark message as read in database
      await axios.put(`/api/message/message/${messageId}/read`, {}, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      // Emit socket event for real-time read receipt
      socket.current.emit('message read', {
        messageId,
        chat: currentChat,
        readBy: user,
      });
    } catch (error) {
      console.error('Failed to mark message as read in real-time:', error);
    }
  };

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      socket.current.emit('typing', currentChat._id);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.current.emit('stop typing', currentChat._id);
    }, 3000);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSearch = async () => {
    const { data } = await axios.get(`/api/message/${currentChat._id}/search?keyword=${searchKeyword}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    setSearchResults(data);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll to and highlight message
  const scrollToMessage = (msgId) => {
    setHighlightedMsgId(msgId);
    setSearchResults([]);
    setSearchKeyword('');
  };

  // Scroll to highlighted message after DOM update
  useEffect(() => {
    if (highlightedMsgId) {
      const ref = messageRefs.current[highlightedMsgId];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlightedMsgId(null), 2000);
      }
    }
  }, [highlightedMsgId]);

  const renderMessage = (msg, idx) => {
    const isOwnMessage = msg.sender._id === user._id;
    const isRead = msg.readBy && msg.readBy.some(reader => reader._id !== user._id);
    const isHighlighted = highlightedMsgId === msg._id;
    
    return (
      <div 
        key={msg._id}
        ref={el => messageRefs.current[msg._id] = el}
        className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}${isHighlighted ? ' search-highlight' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
          margin: '10px 0',
          padding: '10px',
          backgroundColor: isHighlighted ? '#fff3cd' : (isOwnMessage ? '#007bff' : '#f1f1f1'),
          color: isOwnMessage ? 'white' : 'black',
          borderRadius: '10px',
          maxWidth: '70%',
          alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
          boxShadow: isHighlighted ? '0 0 0 2px #ffc107' : undefined,
          transition: 'background 0.3s, box-shadow 0.3s',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          {msg.sender.name}
        </div>
        {msg.isDeleted ? (
          <div style={{ fontStyle: 'italic', color: '#888' }}>This message was deleted</div>
        ) : msg.messageType === 'file' ? (
          <div>
            <div>📎 {msg.fileName}</div>
            <a 
              href={msg.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: isOwnMessage ? 'white' : 'blue' }}
            >
              Download File
            </a>
          </div>
        ) : (
          <div>{msg.content}</div>
        )}
        <div style={{ 
          fontSize: '12px', 
          marginTop: '5px',
          opacity: 0.7 
        }}>
          {formatTime(msg.createdAt)}
          {isOwnMessage && (
            <span style={{ marginLeft: '5px' }}>
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
        {!msg.isDeleted && isOwnMessage && (
          <button
            onClick={() => deleteMessage(msg._id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '5px',
              opacity: 0.7
            }}
          >
            Delete
          </button>
        )}
      </div>
    );
  };

  // Insert emoji at cursor position
  const addEmoji = (emoji) => {
    const emojiNative = emoji.native;
    const input = messageInputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newValue = newMessage.slice(0, start) + emojiNative + newMessage.slice(end);
    setNewMessage(newValue);
    setShowEmojiPicker(false);
    setTimeout(() => {
      input.focus();
      input.selectionStart = input.selectionEnd = start + emojiNative.length;
    }, 0);
  };

  // Search for users to add to group
  const searchUsersForGroup = async () => {
    if (!memberSearchQuery.trim()) return;
    
    try {
      const { data } = await axios.get(`/api/user?search=${memberSearchQuery}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      // Filter out users who are already in the group
      const existingMemberIds = currentChat.users.map(user => user._id);
      const availableUsers = data.filter(user => !existingMemberIds.includes(user._id));
      
      setMemberSearchResults(availableUsers);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  // Add user to selected new members list
  const addToSelectedMembers = (userToAdd) => {
    if (selectedNewMembers.find(u => u._id === userToAdd._id)) return;
    setSelectedNewMembers([...selectedNewMembers, userToAdd]);
    setMemberSearchQuery('');
    setMemberSearchResults([]);
  };

  // Remove user from selected new members list
  const removeFromSelectedMembers = (userId) => {
    setSelectedNewMembers(selectedNewMembers.filter(u => u._id !== userId));
  };

  // Add selected members to the group
  const addMembersToGroup = async () => {
    if (selectedNewMembers.length === 0) {
      alert('Please select at least one user to add');
      return;
    }

    try {
      const { data } = await axios.put(
        `/api/chat/group/add`,
        {
          chatId: currentChat._id,
          users: JSON.stringify(selectedNewMembers.map(u => u._id)),
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      // Update the current chat with new members
      currentChat.users = [...currentChat.users, ...selectedNewMembers];
      
      // Reset modal state
      setShowAddMembersModal(false);
      setSelectedNewMembers([]);
      setMemberSearchQuery('');
      setMemberSearchResults([]);
      
      alert(`Successfully added ${selectedNewMembers.length} member(s) to the group!`);
    } catch (error) {
      alert('Failed to add members to group');
      console.error(error);
    }
  };

  return (
    <div className='chat-container'>
      {/* Chat Header */}
      <div className='chat-header' style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div className='fade-in-up'>
          <h3>{currentChat.isGroupChat ? currentChat.chatName : chatUser?.name}</h3>
          {(!currentChat.isGroupChat && chatUser) && (
            <small>
              Status: <span style={{ 
                color: chatUser.status === 'online' ? '#48bb78' : '#cbd5e0',
                fontWeight: '600'
              }}>{chatUser.status || 'offline'}</span>
            </small>
          )}
        </div>
        <div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className='btn-primary'
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.3s ease'
            }}
          >
            {currentChat.isGroupChat ? 'Members' : 'Profile'}
          </button>
        </div>
      </div>

      {/* User Profile Modal for one-on-one chat */}
      {showProfile && chatUser && !currentChat.isGroupChat && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '300px'
        }}>
          <h3>{chatUser.name}</h3>
          <p><strong>Email:</strong> {chatUser.email}</p>
          <p><strong>Status:</strong> {chatUser.status || 'offline'}</p>
          {chatUser.bio && <p><strong>Bio:</strong> {chatUser.bio}</p>}
          {chatUser.phone && <p><strong>Phone:</strong> {chatUser.phone}</p>}
          <button
            onClick={() => setShowProfile(false)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Group Members Modal for group chat */}
      {showProfile && currentChat.isGroupChat && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '350px',
          maxWidth: '90vw'
        }}>
          <h3>Group Members</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {currentChat.users && currentChat.users.map((member) => (
              <li key={member._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <img
                  src={member.pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                  alt={member.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{member.email}</div>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                setShowProfile(false);
                setShowAddMembersModal(true);
              }}
              className='btn-primary'
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #48bb78, #38a169)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              👥 Add Members
            </button>
            <button
              onClick={() => setShowProfile(false)}
              className='btn-secondary'
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className='chat-search' style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
        <input
          type='text'
          placeholder='Search messages...'
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ width: '70%', padding: '8px' }}
        />
        <button 
          onClick={handleSearch}
          style={{ 
            width: '25%', 
            marginLeft: '5%', 
            padding: '8px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
      </div>

      <div className='search-results' style={{ padding: '10px', maxHeight: '100px', overflowY: 'auto' }}>
        {searchResults.map((msg, idx) => (
          <div
            key={msg._id}
            className='chat-message search-highlight'
            style={{ padding: '5px', backgroundColor: '#fff3cd', cursor: 'pointer' }}
            onClick={() => scrollToMessage(msg._id)}
          >
            <strong>{msg.sender.name}: </strong>{msg.content}
          </div>
        ))}
      </div>

      <div className='chat-messages' style={{ 
        flex: 1, 
        padding: '10px', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {messages.map((msg, idx) => renderMessage(msg, idx))}
        {isTyping && (
          <div style={{ 
            padding: '10px', 
            fontStyle: 'italic', 
            color: '#666' 
          }}>
            Someone is typing...
          </div>
        )}
      </div>

      <div className='chat-input'>
        {/* Emoji Picker Button */}
        <button
          onClick={() => setShowEmojiPicker((v) => !v)}
          className='emoji-btn'
        >
          😊
        </button>
        {showEmojiPicker && (
          <div style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
            <Picker data={data} onEmojiSelect={addEmoji} theme="light" />
          </div>
        )}
        <input
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
        />
        <label 
          htmlFor="file-input"
          className='file-btn'
        >
          📎
        </label>
        
        {selectedFile && (
          <span style={{ 
            fontSize: '0.8rem', 
            color: '#6c757d',
            background: '#f8fafc',
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            📄 {selectedFile.name}
          </span>
        )}
        
        <input
          ref={messageInputRef}
          type='text'
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder='Type a message...'
          className='slide-in-right'
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button 
          onClick={sendMessage}
          className='send-btn'
        >
          Send
        </button>
      </div>

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <div className="modal">
          <div className="modal-content" style={{
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3>Add Members to Group</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                style={{ 
                  width: '70%', 
                  padding: '0.75rem',
                  marginRight: '10px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0'
                }}
              />
              <button 
                onClick={searchUsersForGroup}
                style={{
                  width: '25%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #48bb78, #38a169)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🔍 Search
              </button>
            </div>
            
            {/* Search Results */}
            {memberSearchResults.length > 0 && (
              <div style={{ 
                marginBottom: '15px', 
                maxHeight: '120px', 
                overflowY: 'auto',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Available Users:</h4>
                {memberSearchResults.map((searchUser) => (
                  <div 
                    key={searchUser._id}
                    onClick={() => addToSelectedMembers(searchUser)}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      marginBottom: '5px',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <img
                      src={searchUser.pic || 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg'}
                      alt={searchUser.name}
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        marginRight: '10px',
                        objectFit: 'cover'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: '600', color: '#2d3748' }}>{searchUser.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>{searchUser.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Selected Members */}
            {selectedNewMembers.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Selected Members ({selectedNewMembers.length}):</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedNewMembers.map((selectedUser) => (
                    <div 
                      key={selectedUser._id}
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>{selectedUser.name}</span>
                      <button 
                        onClick={() => removeFromSelectedMembers(selectedUser._id)}
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.3)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => {
                  setShowAddMembersModal(false);
                  setSelectedNewMembers([]);
                  setMemberSearchQuery('');
                  setMemberSearchResults([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={addMembersToGroup}
                className="btn-primary"
                disabled={selectedNewMembers.length === 0}
                style={{
                  opacity: selectedNewMembers.length === 0 ? 0.5 : 1,
                  cursor: selectedNewMembers.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Add {selectedNewMembers.length} Member{selectedNewMembers.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
