import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  LogOut,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import {
  authApi,
  chatApi,
  type AuthUser,
  type ConversationListItem,
  type EncryptedMessage,
  type SearchUser,
  userApi,
} from "../../services/authApi";
import { dbService, type ContactKey } from "../../services/dbService";
import { cryptoService } from "../../services/cryptoService";
import {
  socketService,
  type MessageStatusUpdate,
  type PresenceStatus,
  type PresenceUpdate,
} from "../../services/socketService";

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  text: string;
  status: EncryptedMessage["status"];
  createdAt: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DeliveryTicks({ status }: { status: EncryptedMessage["status"] }) {
  if (status === "read") {
    return <span className="font-semibold text-[#2FA8C4]">✓✓</span>;
  }

  if (status === "delivered") {
    return <span className="font-semibold text-zinc-400">✓✓</span>;
  }

  return <span className="font-semibold text-zinc-400">✓</span>;
}

function Avatar({
  user,
  className,
  presence,
}: {
  user: Pick<AuthUser, "name" | "avatarUrl">;
  className: string;
  presence?: PresenceStatus;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#004D61] to-[#822659] ${className}`}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.name} avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#F0F0F0]">
          {initials(user.name)}
        </div>
      )}
      {presence && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1A1A1A] ${presence === "online" ? "bg-emerald-500" : "bg-red-500"}`}
        />
      )}
    </div>
  );
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<SearchUser | null>(
    null,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<
    DecryptedMessage[]
  >([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [presenceStatuses, setPresenceStatuses] = useState<
    Record<string, PresenceStatus>
  >({});
  const deliveredReceiptIds = useRef<Set<string>>(new Set());
  const readReceiptIds = useRef<Set<string>>(new Set());

  const displayName = useMemo(() => user.name || user.email, [user]);
  const getPresenceStatus = (userId: string): PresenceStatus =>
    presenceStatuses[userId] ?? "offline";

  const onlineConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          (presenceStatuses[conversation.recipient.id] ?? "offline") ===
          "online",
      ),
    [conversations, presenceStatuses],
  );

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      try {
        const loadedConversations = await chatApi.listConversations();
        if (mounted) {
          setConversations(loadedConversations);
        }
      } catch (error) {
        if (mounted) {
          setChatError(
            error instanceof Error
              ? error.message
              : "Failed to load conversations",
          );
        }
      } finally {
        if (mounted) {
          setLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handlePresenceUpdate = (update: PresenceUpdate) => {
      setPresenceStatuses((currentStatuses) => ({
        ...currentStatuses,
        [update.userId]: update.status,
      }));
    };

    socketService.connect();
    socketService.onPresenceUpdate(handlePresenceUpdate);

    return () => {
      socketService.offPresenceUpdate(handlePresenceUpdate);
    };
  }, []);

  useEffect(() => {
    const userIds = [
      ...conversations.map((conversation) => conversation.recipient.id),
      ...results.map((result) => result.id),
      selectedContact?.id,
    ].filter(Boolean) as string[];

    if (userIds.length === 0) return;

    let cancelled = false;
    socketService.requestPresence(userIds).then((statuses) => {
      if (!cancelled) {
        setPresenceStatuses((currentStatuses) => ({
          ...currentStatuses,
          ...statuses,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [conversations, results, selectedContact]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const foundUsers = await userApi.searchUsers(trimmedQuery);
        setResults(foundUsers);
      } catch (error) {
        setResults([]);
        setSearchError(
          error instanceof Error ? error.message : "Search failed",
        );
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleIncomingMessage = (message: EncryptedMessage) => {
      if (
        message.senderId !== user.id &&
        !deliveredReceiptIds.current.has(message.id)
      ) {
        deliveredReceiptIds.current.add(message.id);
        socketService.markMessageDelivered(message.id);
      }

      if (message.conversationId === conversationId) {
        setMessages((currentMessages) => {
          if (currentMessages.some((existing) => existing.id === message.id)) {
            return currentMessages;
          }
          return [...currentMessages, message];
        });
      } else if (message.senderId !== user.id) {
        void chatApi
          .listConversations()
          .then(setConversations)
          .catch(() => undefined);
      }

      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.conversationId === message.conversationId
            ? { ...conversation, lastMessage: message }
            : conversation,
        ),
      );
    };

    const handleMessageStatusUpdate = (update: MessageStatusUpdate) => {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === update.messageId
            ? { ...message, status: update.status }
            : message,
        ),
      );
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.lastMessage?.id === update.messageId
            ? {
                ...conversation,
                lastMessage: {
                  ...conversation.lastMessage,
                  status: update.status,
                },
              }
            : conversation,
        ),
      );
    };

    socketService.onNewMessage(handleIncomingMessage);
    socketService.onMessageStatusUpdate(handleMessageStatusUpdate);

    return () => {
      socketService.offNewMessage(handleIncomingMessage);
      socketService.offMessageStatusUpdate(handleMessageStatusUpdate);
    };
  }, [conversationId, user.id]);

  useEffect(() => {
    if (!conversationId) return;

    socketService.joinConversation(conversationId);

    return () => {
      socketService.leaveConversation(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    for (const message of messages) {
      if (
        message.senderId !== user.id &&
        !deliveredReceiptIds.current.has(message.id)
      ) {
        deliveredReceiptIds.current.add(message.id);
        socketService.markMessageDelivered(message.id);
      }
    }
  }, [messages, user.id]);

  useEffect(() => {
    if (!conversationId) return;

    for (const message of messages) {
      if (
        message.senderId !== user.id &&
        !readReceiptIds.current.has(message.id)
      ) {
        readReceiptIds.current.add(message.id);
        socketService.markMessageRead(message.id);
      }
    }
  }, [conversationId, messages, user.id]);

  useEffect(() => {
    let cancelled = false;

    async function decryptMessages() {
      const decrypted = await Promise.all(
        messages.map(async (message) => {
          const mine = message.senderId === user.id;
          const bundle = mine
            ? {
                ciphertext: message.senderCiphertext,
                iv: message.senderIv,
              }
            : {
                ciphertext: message.receiverCiphertext,
                iv: message.receiverIv,
              };

          try {
            const text = await cryptoService.decryptMessageForPublicKey(
              bundle,
              user.publicKey,
            );
            return {
              id: message.id,
              senderId: message.senderId,
              text,
              status: message.status,
              createdAt: message.createdAt,
            };
          } catch {
            return {
              id: message.id,
              senderId: message.senderId,
              text: "Unable to decrypt message on this device.",
              status: message.status,
              createdAt: message.createdAt,
            };
          }
        }),
      );

      if (!cancelled) {
        setDecryptedMessages(decrypted);
      }
    }

    void decryptMessages();

    return () => {
      cancelled = true;
    };
  }, [messages, user.id, user.publicKey]);

  const handleOpenConversation = async (conversation: ConversationListItem) => {
    setChatError(null);
    try {
      await dbService.saveContactPublicKey({
        name: conversation.recipient.name,
        email: conversation.recipient.email,
        userId: conversation.recipient.id,
        publicKey: conversation.recipient.publicKey,
      });
      const history = await chatApi.getMessages(conversation.conversationId);
      setSelectedContact(conversation.recipient);
      setConversationId(conversation.conversationId);
      setMessages(history);
      setQuery("");
      setResults([]);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Failed to open conversation",
      );
    }
  };

  const handleStartChat = async (foundUser: SearchUser) => {
    setSavingId(foundUser.id);
    setSearchError(null);
    setChatError(null);
    try {
      const contact: ContactKey = {
        name: foundUser.name,
        email: foundUser.email,
        userId: foundUser.id,
        publicKey: foundUser.publicKey,
      };

      await dbService.saveContactPublicKey(contact);
      const conversation = await chatApi.createOrGetConversation(foundUser.id);
      const history = await chatApi.getMessages(conversation.conversationId);

      setSelectedContact(conversation.recipient);
      setConversationId(conversation.conversationId);
      setMessages(history);
      setConversations((currentConversations) => {
        const nextConversation: ConversationListItem = {
          conversationId: conversation.conversationId,
          recipient: conversation.recipient,
          lastMessage: history.at(-1) ?? null,
        };

        const existing = currentConversations.some(
          (item) => item.conversationId === conversation.conversationId,
        );

        if (existing) {
          return currentConversations.map((item) =>
            item.conversationId === conversation.conversationId
              ? { ...item, ...nextConversation }
              : item,
          );
        }

        return [nextConversation, ...currentConversations];
      });
      setQuery("");
      setResults([]);
      setIsNewChatOpen(false);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to start chat",
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !selectedContact || !conversationId || sending)
      return;

    setSending(true);
    setChatError(null);
    try {
      const receiverBundle = await cryptoService.encryptMessageForPublicKey(
        trimmedMessage,
        selectedContact.publicKey,
      );
      const senderBundle = await cryptoService.encryptMessageForPublicKey(
        trimmedMessage,
        user.publicKey,
      );

      const savedMessage = await chatApi.sendMessage({
        conversationId,
        receiverCiphertext: receiverBundle.ciphertext,
        receiverIv: receiverBundle.iv,
        senderCiphertext: senderBundle.ciphertext,
        senderIv: senderBundle.iv,
      });

      setMessages((currentMessages) => {
        if (currentMessages.some((message) => message.id === savedMessage.id)) {
          return currentMessages;
        }
        return [...currentMessages, savedMessage];
      });
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.conversationId === savedMessage.conversationId
            ? { ...conversation, lastMessage: savedMessage }
            : conversation,
        ),
      );
      setMessageText("");
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      await dbService.clearSecureStore();
      socketService.disconnect();
      onLogout();
    }
  };

  const handleBackToList = () => {
    setSelectedContact(null);
    setConversationId(null);
  };

  return (
    <div className="h-svh overflow-hidden bg-[#1A1A1A] p-3 text-[#F0F0F0] sm:p-4 lg:p-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #004D61;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #822659;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #004D61 transparent;
        }
      `}</style>
      <div className="flex h-full min-h-0 gap-3 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl shadow-black/40 md:flex md:w-[340px] lg:w-[380px] ${
            selectedContact ? "hidden" : "flex"
          }`}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-5 pt-5">
              <h1 className="text-lg font-semibold text-[#F0F0F0]">
                Messages ({conversations.length})
              </h1>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="flex items-center gap-1 rounded-full bg-[#3E5641] px-3 py-1.5 text-sm font-medium text-[#F0F0F0] transition hover:bg-[#4C6B50]"
                type="button"
              >
                <Plus className="h-4 w-4" />
                Create New
              </button>
            </div>

            <div className="flex items-center justify-between px-5 pt-2">
              <p className="text-xs text-zinc-400">Welcome, {displayName}</p>
              <button
                onClick={handleLogout}
                className="rounded-full p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-[#2FA8C4]"
                type="button"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 rounded-full bg-[#242424] px-4 py-2.5">
                <input
                  value={query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="w-full bg-transparent text-sm text-[#F0F0F0] outline-none placeholder:text-zinc-500"
                  placeholder="Search Message"
                  type="search"
                />
                {searching ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2FA8C4]" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
              </div>
            </div>

            {query.trim() ? (
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto custom-scrollbar px-3 pb-4 pt-4">
                <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Search results
                </p>
                {searchError && (
                  <p className="mx-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">
                    {searchError}
                  </p>
                )}
                {!searching && results.length === 0 && !searchError && (
                  <p className="mx-2 rounded-xl bg-[#242424] p-3 text-sm text-zinc-400">
                    No users found.
                  </p>
                )}
                {results.map((foundUser) => (
                  <button
                    key={foundUser.id}
                    onClick={() => handleStartChat(foundUser)}
                    disabled={savingId === foundUser.id}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
                    type="button"
                  >
                    <Avatar
                      user={foundUser}
                      className="h-11 w-11"
                      presence={getPresenceStatus(foundUser.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {foundUser.name}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {foundUser.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#822659]/15 p-2 text-[#2FA8C4]">
                      {savingId === foundUser.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Active row */}
                {onlineConversations.length > 0 && (
                  <div className="px-5 pt-5">
                    <p className="pb-2 text-xs font-medium text-zinc-500">
                      Active
                    </p>
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {onlineConversations.map((conversation) => (
                        <button
                          key={conversation.conversationId}
                          onClick={() => handleOpenConversation(conversation)}
                          type="button"
                          aria-label={`Open chat with ${conversation.recipient.name}`}
                        >
                          <Avatar
                            user={conversation.recipient}
                            className="h-10 w-10"
                            presence="online"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1 px-5 pb-2 pt-5 text-xs font-medium text-zinc-500">
                  <Pin className="h-3 w-3" />
                  All Messages
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
                  {loadingConversations ? (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2FA8C4]" />
                      Loading conversations...
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-400">
                      No conversations yet. Click "Create New" to start one.
                    </div>
                  ) : (
                    conversations.map((conversation) => {
                      const active =
                        conversation.conversationId === conversationId;
                      return (
                        <button
                          key={conversation.conversationId}
                          onClick={() => handleOpenConversation(conversation)}
                          className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${active ? "bg-[#242424]" : "hover:bg-white/5"}`}
                          type="button"
                        >
                          <Avatar
                            user={conversation.recipient}
                            className="h-11 w-11"
                            presence={getPresenceStatus(
                              conversation.recipient.id,
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold">
                                {conversation.recipient.name}
                              </p>
                              {conversation.lastMessage && (
                                <span className="shrink-0 text-[10px] text-zinc-500">
                                  {new Date(
                                    conversation.lastMessage.createdAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-zinc-400">
                              {conversation.lastMessage
                                ? "Encrypted message"
                                : conversation.recipient.email}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Chat panel */}
        <main
          className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl shadow-black/40 md:flex ${
            selectedContact ? "flex" : "hidden"
          }`}
        >
          {selectedContact && conversationId ? (
            <div className="flex min-h-0 w-full flex-1 flex-col">
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-white/5 p-5">
                <button
                  onClick={handleBackToList}
                  className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#F0F0F0] md:hidden"
                  type="button"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar
                  user={selectedContact}
                  className="h-11 w-11"
                  presence={getPresenceStatus(selectedContact.id)}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    {selectedContact.name}
                  </h2>
                  <p
                    className={`truncate text-xs ${getPresenceStatus(selectedContact.id) === "online" ? "text-emerald-400" : "text-zinc-400"}`}
                  >
                    {getPresenceStatus(selectedContact.id) === "online"
                      ? "Active Now"
                      : "Offline"}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="relative min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                <div className="relative space-y-3">
                  {chatError && (
                    <p className="rounded-xl border border-red-500/30 bg-red-950/80 p-3 text-sm text-red-200 shadow-sm">
                      {chatError}
                    </p>
                  )}

                  {decryptedMessages.length === 0 ? (
                    <div className="flex min-h-[380px] items-center justify-center text-center text-sm font-medium text-[#F0F0F0]/40">
                      No messages yet. Send the first encrypted message.
                    </div>
                  ) : (
                    decryptedMessages.map((message) => {
                      const mine = message.senderId === user.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`flex max-w-[78%] items-end gap-2 sm:max-w-[70%] ${mine ? "flex-row-reverse" : "flex-row"}`}
                          >
                            {!mine && (
                              <Avatar
                                user={selectedContact}
                                className="h-7 w-7"
                              />
                            )}
                            <div
                              className={`px-4 py-3 text-base leading-relaxed shadow-sm ${
                                mine
                                  ? "rounded-l-2xl rounded-tr-2xl bg-[#004D61] text-[#F0F0F0]"
                                  : "rounded-r-2xl rounded-tl-2xl bg-[#242424] text-[#F0F0F0]"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {message.text}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`mt-1 flex items-center gap-1 text-[10px] text-zinc-500 ${mine ? "pr-1" : "pl-9"}`}
                          >
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            {mine && <DeliveryTicks status={message.status} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="p-4">
                <div className="flex items-center gap-2 rounded-full bg-[#242424] px-3 py-2">
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    className="min-w-0 flex-1 bg-transparent px-2 text-sm text-[#F0F0F0] outline-none placeholder:text-zinc-500"
                    placeholder="Your message here"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sending}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3E5641] text-[#F0F0F0] transition hover:bg-[#4C6B50] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden w-full flex-1 items-center justify-center px-8 text-center md:flex">
              <div>
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#822659]/15 text-[#2FA8C4]">
                  <MessageCircle className="h-14 w-14 fill-[#C2487F]/30" />
                </div>
                <h2 className="mb-2 text-lg font-semibold">
                  No conversation selected
                </h2>
                <p className="text-sm text-zinc-400">
                  Search for a user, click them, and their public key will be
                  cached locally.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-white/5 p-5">
              <div>
                <h2 className="text-lg font-semibold">New chat</h2>
                <p className="text-sm text-zinc-400">
                  Search by name or email to fetch a public key.
                </p>
              </div>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-[#F0F0F0]"
                type="button"
                aria-label="Close new chat modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-3 rounded-full bg-[#242424] px-4 py-2.5">
                <input
                  value={query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  className="w-full bg-transparent text-sm text-[#F0F0F0] outline-none placeholder:text-zinc-500"
                  placeholder="Search Message"
                  type="search"
                  autoFocus
                />
                {searching ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#2FA8C4]" />
                ) : (
                  <Search className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto custom-scrollbar">
                {searchError && (
                  <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">
                    {searchError}
                  </p>
                )}
                {query.trim() &&
                  !searching &&
                  results.length === 0 &&
                  !searchError && (
                    <p className="rounded-xl bg-[#242424] p-3 text-sm text-zinc-400">
                      No users found.
                    </p>
                  )}
                {results.map((foundUser) => (
                  <button
                    key={foundUser.id}
                    onClick={() => handleStartChat(foundUser)}
                    disabled={savingId === foundUser.id}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
                    type="button"
                  >
                    <Avatar
                      user={foundUser}
                      className="h-11 w-11"
                      presence={getPresenceStatus(foundUser.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {foundUser.name}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {foundUser.email}
                      </p>
                    </div>
                    {savingId === foundUser.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#2FA8C4]" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-[#2FA8C4]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}