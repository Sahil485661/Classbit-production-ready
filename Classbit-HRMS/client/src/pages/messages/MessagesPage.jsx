import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Send, MessageSquare, Search, User, MoreVertical, Paperclip, XCircle, Users, Plus, Hash, UserCog } from 'lucide-react';

const MessagesPage = () => {
    const { user } = useSelector((state) => state.auth);
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [departments, setDepartments] = useState([]);
    const [groups, setGroups] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [myManager, setMyManager] = useState(null);
    
    // Group Creation State
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevUnreadRef = useRef(null);

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const fetchUnreadCounts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/messages/inbox', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const counts = {};
            res.data.forEach(msg => {
                if (!msg.isRead) {
                    const key = msg.groupId ? msg.groupId : msg.senderId;
                    counts[key] = (counts[key] || 0) + 1;
                }
            });
            
            const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);
            if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
                playNotificationSound();
            }
            prevUnreadRef.current = totalUnread;
            
            setUnreadCounts(counts);
        } catch (error) {
            console.error('Error fetching unread counts:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCounts();
        const interval = setInterval(fetchUnreadCounts, 10000);
        return () => clearInterval(interval);
    }, []);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const token = localStorage.getItem('token');
                const [empRes, deptRes, groupsRes] = await Promise.all([
                    axios.get('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/employees/departments', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/messages/groups', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                const emps = empRes.data;
                const me = emps.find(e => e.userId === user.id);
                let manager = null;
                if (me) {
                    manager = me.Manager;
                    if (!manager) {
                        manager = emps.find(e => 
                            e.departmentId === me.departmentId && 
                            e.id !== me.id && 
                            (e.User?.Role?.name === 'Manager' || e.designation === 'Manager')
                        );
                    }
                    if (manager) {
                        setMyManager(manager);
                    }
                }
                setChats(emps.filter(e => e.id !== user.employeeId && e.id !== manager?.id));
                setDepartments(deptRes.data);
                setGroups(groupsRes.data);
            } catch (error) {
                console.error('Error fetching chats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchChats();
    }, [user.employeeId]);

    const fetchMessages = async (targetId, type = 'user') => {
        if (!targetId) return;
        try {
            const token = localStorage.getItem('token');
            let endpoint = `/api/messages/${targetId}`;
            if (type === 'department') endpoint = `/api/messages/department/${targetId}`;
            if (type === 'group') endpoint = `/api/messages/groups/${targetId}`;
                
            const res = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
            
            // Clear unread counts for the opened chat
            const clearTargetId = type === 'user' ? (chats.find(c => c.id === targetId)?.userId) : targetId;
            if (clearTargetId) {
                setUnreadCounts(prev => {
                    const newCounts = { ...prev, [clearTargetId]: 0 };
                    prevUnreadRef.current = Object.values(newCounts).reduce((a, b) => a + b, 0);
                    return newCounts;
                });
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    // Auto-refresh messages every 5 seconds
    useEffect(() => {
        if (!activeChat) return;
        const interval = setInterval(() => {
            const type = activeChat.isDepartment ? 'department' : activeChat.isGroup ? 'group' : 'user';
            fetchMessages(activeChat.id, type);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeChat?.id, activeChat?.isDepartment, activeChat?.isGroup]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/messages/groups', 
                { name: groupName, memberIds: selectedMembers },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setGroups(prev => [...prev, res.data]);
            setShowGroupModal(false);
            setGroupName('');
            setSelectedMembers([]);
            
            // Switch to new group
            setMessages([]);
            setActiveChat({ isGroup: true, id: res.data.id, name: res.data.name });
            fetchMessages(res.data.id, 'group');
        } catch (err) {
            console.error('Error creating group:', err);
            alert('Failed to create group');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !file) || !activeChat) return;

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            
            if (activeChat.isDepartment) {
                formData.append('departmentId', activeChat.id);
            } else if (activeChat.isGroup) {
                formData.append('groupId', activeChat.id);
            } else {
                formData.append('recipientId', activeChat.id);
            }

            formData.append('content', newMessage);
            if (file) {
                formData.append('attachment', file);
            }

            const res = await axios.post('/api/messages', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (activeChat.isDepartment) {
                fetchMessages(activeChat.id, 'department');
            } else if (activeChat.isGroup) {
                fetchMessages(activeChat.id, 'group');
            } else {
                setMessages(prev => [...prev, res.data]);
            }
            setNewMessage('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('Send error:', error);
            alert('Failed to send message');
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl transition-colors">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)]/10">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 italic">Secure Messaging</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Find coworker..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-6 text-center text-[var(--text-secondary)] text-sm italic">Syncing directory...</div>
                    ) : (
                        <>
                            {/* Department Broadcasts */}
                            {(user.role === 'Super Admin' || user.role === 'HR' || user.role === 'Manager') && departments.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="px-6 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">Department Broadcasts</h3>
                                    {departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map(dept => (
                                        <div
                                            key={`dept-${dept.id}`}
                                            onClick={() => {
                                                setMessages([]);
                                                setActiveChat({ isDepartment: true, id: dept.id, name: dept.name });
                                                fetchMessages(dept.id, 'department');
                                            }}
                                            className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${activeChat?.isDepartment && activeChat?.id === dept.id ? 'bg-indigo-600/10 border-indigo-500' : 'border-transparent hover:bg-[var(--bg-secondary)]/50'}`}
                                        >
                                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">{dept.name}</h4>
                                                <p className="text-[11px] text-[var(--text-secondary)] truncate">Broadcast to department</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Chat Groups */}
                            <div className="mb-4">
                                <div className="px-6 py-2 border-b border-[var(--border-color)] flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Chat Groups</h3>
                                    <button onClick={() => setShowGroupModal(true)} className="p-1 hover:bg-[var(--text-secondary)]/20 rounded text-blue-500">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                {groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).map(group => (
                                    <div
                                        key={`grp-${group.id}`}
                                        onClick={() => {
                                            setMessages([]);
                                            setActiveChat({ isGroup: true, id: group.id, name: group.name });
                                            fetchMessages(group.id, 'group');
                                        }}
                                        className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${activeChat?.isGroup && activeChat?.id === group.id ? 'bg-orange-600/10 border-orange-500' : 'border-transparent hover:bg-[var(--bg-secondary)]/50'}`}
                                    >
                                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-sm">
                                            <Hash className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">{group.name}</h4>
                                                {unreadCounts[group.id] > 0 && (
                                                    <span className="bg-orange-500 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
                                                        {unreadCounts[group.id]}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                                {unreadCounts[group.id] > 0 ? "New message in group" : "Group Chat"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Direct Messages */}
                            <h3 className="px-6 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">Direct Messages</h3>
                            
                            {myManager && (
                                <div
                                    key={`mgr-${myManager.id}`}
                                    onClick={() => {
                                        setMessages([]);
                                        const mgrChatInfo = { ...myManager, isManagerRole: true };
                                        setActiveChat(mgrChatInfo);
                                        fetchMessages(myManager.id, 'user');
                                    }}
                                    className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${activeChat?.id === myManager.id ? 'bg-indigo-600/10 border-indigo-500' : 'border-transparent hover:bg-[var(--bg-secondary)]/50'}`}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-sm">
                                            <UserCog className="w-5 h-5" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--card-bg)] rounded-full"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">My Manager</h4>
                                            {unreadCounts[myManager.userId] > 0 && (
                                                <span className="bg-indigo-600 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
                                                    {unreadCounts[myManager.userId]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                            {myManager.firstName} {myManager.lastName}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {chats.filter(chat =>
                                `${chat.firstName} ${chat.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                            ).length === 0 ? (
                                <div className="p-10 text-center text-[var(--text-secondary)] text-xs opacity-50">No coworkers found</div>
                            ) : chats.filter(chat =>
                                `${chat.firstName} ${chat.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => {
                                setMessages([]); // Clear current messages for new chat
                                setActiveChat(chat);
                                fetchMessages(chat.id, 'user');
                            }}
                            className={`p-4 flex items-center gap-4 cursor-pointer transition-all border-l-4 ${activeChat?.id === chat.id ? 'bg-blue-600/10 border-blue-500' : 'border-transparent hover:bg-[var(--bg-secondary)]/50'}`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-blue-400 border border-[var(--border-color)] shadow-sm">
                                    {chat.firstName?.[0]}{chat.lastName?.[0]}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--card-bg)] rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">{chat.firstName} {chat.lastName}</h4>
                                    {unreadCounts[chat.userId] > 0 && (
                                        <span className="bg-blue-600 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
                                            {unreadCounts[chat.userId]}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                                    {unreadCounts[chat.userId] > 0 ? "New message received" : "Tap to chat"}
                                </p>
                            </div>
                        </div>
                    ))}
                    </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {activeChat ? (
                <div className="flex-1 flex flex-col bg-[var(--card-bg)]">
                    {/* Header */}
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]/5">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${activeChat.isDepartment ? 'bg-indigo-600' : activeChat.isGroup ? 'bg-orange-500' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-black/10`}>
                                {activeChat.isDepartment ? <Users className="w-5 h-5"/> : activeChat.isGroup ? <Hash className="w-5 h-5" /> : `${activeChat.firstName?.[0]}${activeChat.lastName?.[0]}`}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">{activeChat.isDepartment ? `${activeChat.name} Department` : activeChat.isGroup ? activeChat.name : activeChat.isManagerRole ? `My Manager (${activeChat.firstName} ${activeChat.lastName})` : `${activeChat.firstName} ${activeChat.lastName}`}</h3>
                                <p className={`text-[10px] ${activeChat.isDepartment ? 'text-indigo-500' : activeChat.isGroup ? 'text-orange-500' : activeChat.isManagerRole ? 'text-indigo-500' : (activeChat.User?.lastLogin ? 'text-green-500' : 'text-[var(--text-secondary)]')} font-bold uppercase tracking-widest text-left`}>
                                    {activeChat.isDepartment ? 'Broadcast Channel' : activeChat.isGroup ? 'Group Conversation' : (activeChat.User?.lastLogin ? `Last Active: ${new Date(activeChat.User.lastLogin).toLocaleDateString()} ${new Date(activeChat.User.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline')}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-secondary)]/5 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-20 text-[var(--text-secondary)]">
                                {activeChat.isDepartment ? (
                                    <>
                                        <Users className="w-20 h-20 mb-6 opacity-20 text-indigo-500" />
                                        <h3 className="text-xl font-bold opacity-50 text-[var(--text-primary)]">Department Broadcast</h3>
                                        <p className="text-sm mt-2 opacity-50">Messages sent here will be delivered individually to every employee inside the {activeChat.name} department.</p>
                                    </>
                                ) : activeChat.isGroup ? (
                                    <>
                                        <Hash className="w-20 h-20 mb-6 opacity-20 text-orange-500" />
                                        <h3 className="text-xl font-bold opacity-50 text-[var(--text-primary)]">Group Chat</h3>
                                        <p className="text-sm mt-2 opacity-50">Collaborate with your team right here.</p>
                                    </>
                                ) : (
                                    <>
                                        <MessageSquare className="w-20 h-20 mb-6 opacity-20" />
                                        <h3 className="text-xl font-bold opacity-30">End-to-End Encrypted</h3>
                                        <p className="text-sm mt-2 opacity-30">Your business communication is secure and private.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            messages.map((msg, index) => {
                                const msgDate = new Date(msg.createdAt).toLocaleDateString();
                                const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt).toLocaleDateString() : null;
                                const showDateDivider = msgDate !== prevMsgDate;
                                
                                let displayDate = msgDate;
                                if (msgDate === new Date().toLocaleDateString()) {
                                    displayDate = 'Today';
                                } else if (msgDate === new Date(Date.now() - 86400000).toLocaleDateString()) {
                                    displayDate = 'Yesterday';
                                }

                                return (
                                <React.Fragment key={msg.id}>
                                    {showDateDivider && (
                                        <div className="flex justify-center my-4">
                                            <span className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                                {displayDate}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-4 rounded-3xl text-sm shadow-sm ${msg.senderId === user.id
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-bl-none'
                                            }`}>
                                            {msg.senderId !== user.id && (activeChat.isDepartment || activeChat.isGroup) && (
                                                <div className="text-[10px] font-bold opacity-60 mb-1 text-left text-orange-500">
                                                    {msg.Sender?.Employee?.firstName || msg.Sender?.email || 'Unknown User'}
                                                </div>
                                            )}
                                            {msg.content && <p className="leading-relaxed text-left">{msg.content}</p>}
                                            {msg.attachment && (() => {
                                                // Normalize path and build a clean URL
                                                const cleanPath = msg.attachment.replace(/\\/g, '/');
                                                const fileName = cleanPath.split('/').pop().replace(/^\d+-/, '') || 'Attachment';
                                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                                                return (
                                                    <div className={`mt-2 ${msg.content ? 'pt-2 border-t border-white/10' : ''}`}>
                                                        {isImage ? (
                                                            <a href={`/${cleanPath}`} target="_blank" rel="noopener noreferrer">
                                                                <img
                                                                    src={`/${cleanPath}`}
                                                                    alt={fileName}
                                                                    className="max-w-[220px] rounded-xl mt-1 border border-white/10 hover:opacity-90 transition-opacity"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <a
                                                                href={`/${cleanPath}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-[10px] font-bold underline hover:no-underline opacity-90"
                                                            >
                                                                <Paperclip className="w-3 h-3" />
                                                                {fileName}
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            <p className={`text-[9px] mt-2 font-bold opacity-60 ${msg.senderId === user.id ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </React.Fragment>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/10">
                        {file && (
                            <div className="mb-4 flex items-center justify-between bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <Paperclip className="w-4 h-4 text-blue-400 shrink-0" />
                                    <span className="text-xs text-blue-400 truncate font-medium">{file.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-4 items-center bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-2.5 shadow-lg shadow-black/5">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <input
                                type="text"
                                placeholder="Write your message..."
                                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] focus:outline-none px-2"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() && !file}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)]/5 px-10">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
                        <MessageSquare className="w-12 h-12 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] italic">Select a Chat to Begin</h2>
                    <p className="mt-2 text-sm max-w-sm text-center opacity-70">Experience seamless enterprise messaging integrated with Classbit's HR ecosystem.</p>
                </div>
            )}

            {/* Create Group Modal */}
            {showGroupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[var(--card-bg)] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setShowGroupModal(false)} className="absolute top-4 right-4 p-2 hover:bg-[var(--bg-secondary)] rounded-xl"><XCircle className="w-5 h-5 text-slate-400" /></button>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2"><Hash className="w-5 h-5 text-orange-500" /> New Chat Group</h2>
                        <form onSubmit={handleCreateGroup}>
                            <div className="mb-4">
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Group Name</label>
                                <input type="text" required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Project Alpha Team" className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/50" />
                            </div>
                            <div className="mb-6">
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block">Select Members</label>
                                <div className="h-48 overflow-y-auto bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl p-2 custom-scrollbar">
                                    {chats.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-secondary)] rounded-lg cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedMembers.includes(emp.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedMembers(prev => [...prev, emp.id]);
                                                    else setSelectedMembers(prev => prev.filter(id => id !== emp.id));
                                                }}
                                                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                                            />
                                            <span className="text-sm font-medium">{emp.firstName} {emp.lastName}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowGroupModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]">Cancel</button>
                                <button type="submit" disabled={!groupName || selectedMembers.length === 0} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20">Create Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;
