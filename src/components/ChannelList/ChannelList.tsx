import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChannels } from "../../hooks/useChannels";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useFirestoreQuery, QueryConfig } from "../../hooks/useFirestoreQuery";
import { Channel } from "../../types";
import Form from "../common/Form";
import ConfirmDialog from "../common/ConfirmDialog";
import { useToast } from "../../contexts/ToastContext";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  FaUser,
  FaClock,
  FaHashtag,
  FaLink,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { formatRelativeTime } from "../../utils/dateUtils";
import "./ChannelList.css";
import { useChannelLinkCounts } from "../../hooks/useChannelLinkCounts";
import { Timestamp } from "firebase/firestore";

const CHANNELS_PER_PAGE = 20;

const ChannelList: React.FC = () => {
  const navigate = useNavigate();
  const { addChannel, deleteChannel, updateChannel, getUsernameById, isDeletingChannel } = useChannels();
  const { user, profile, loading: authLoading } = useAuthUser();
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    channelId: string | null;
  }>({ isOpen: false, channelId: null });
  const { showToast } = useToast();
  const [creatorUsernames, setCreatorUsernames] = useState<Record<string, string>>({});
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);

  const channelsConfig: QueryConfig = useMemo(
    () => ({
      collectionName: "channels",
      conditions: [],
      sortBy: { field: "createdAt", direction: "desc" as const },
      limitCount: CHANNELS_PER_PAGE,
    }),
    []
  );

  const {
    data: channels,
    loading,
    error,
    hasMore,
  } = useFirestoreQuery<Channel>(channelsConfig);

  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      const aSubscribed = profile?.subscribedChannels?.includes(a.id) || false;
      const bSubscribed = profile?.subscribedChannels?.includes(b.id) || false;

      if (aSubscribed !== bSubscribed) {
        return aSubscribed ? -1 : 1;
      }

      // Sort by createdAt in descending order
      const aTimestamp = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTimestamp = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTimestamp - aTimestamp;
    });
  }, [channels, profile?.subscribedChannels]);

  const channelIds = useMemo(() => channels.map(channel => channel.id), [channels]);
  const { linkCounts, loading: linkCountsLoading, error: linkCountsError } = useChannelLinkCounts(channelIds);

  useEffect(() => {
    const fetchCreatorUsernames = async () => {
      const newUsernames: Record<string, string> = {};
      let hasNewUsernames = false;

      for (const channel of sortedChannels) {
        if (!creatorUsernames[channel.createdBy]) {
          const username = await getUsernameById(channel.createdBy);
          newUsernames[channel.createdBy] = username;
          hasNewUsernames = true;
        }
      }

      if (hasNewUsernames) {
        setCreatorUsernames(prevUsernames => ({ ...prevUsernames, ...newUsernames }));
      }
    };

    fetchCreatorUsernames();
  }, [sortedChannels, getUsernameById]);

  const handleAddChannel = useCallback(
    async (formData: { [key: string]: string }) => {
      const { channelName } = formData;
      if (channelName.trim()) {
        const channelExists = channels.some(
          (channel) =>
            channel.name.toLowerCase() === channelName.trim().toLowerCase()
        );

        if (channelExists) {
          showToast({
            message: "A channel with this name already exists",
            type: "error",
          });
          return;
        }

        try {
          await addChannel(channelName);
          showToast({ message: "Channel added successfully", type: "success" });
        } catch (error) {
          console.error("Error adding channel:", error);
          showToast({ message: "Failed to add channel", type: "error" });
        }
      }
    },
    [channels, addChannel, showToast]
  );

  const handleEditChannel = useCallback((channel: Channel) => {
    setEditingChannelId(channel.id);
  }, []);

  const handleUpdateChannel = useCallback(
    async (formData: { [key: string]: string }) => {
      const { channelName } = formData;
      if (channelName.trim() && editingChannelId) {
        const currentChannel = channels.find(
          (channel: Channel) => channel.id === editingChannelId
        );
        if (currentChannel && currentChannel.name !== channelName.trim()) {
          const channelExists = channels.some(
            (channel: Channel) =>
              channel.id !== editingChannelId &&
              channel.name.toLowerCase() === channelName.trim().toLowerCase()
          );

          if (channelExists) {
            showToast({
              message: "A channel with this name already exists",
              type: "error",
            });
            return;
          }

          try {
            await updateChannel(editingChannelId, channelName);
            showToast({
              message: "Channel updated successfully",
              type: "success",
            });
          } catch (error) {
            console.error("Error updating channel:", error);
            showToast({ message: "Failed to update channel", type: "error" });
          }
        }
        setEditingChannelId(null);
      }
    },
    [channels, editingChannelId, updateChannel, showToast]
  );

  const handleDeleteClick = useCallback((channelId: string) => {
    setDeleteConfirmation({ isOpen: true, channelId });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmation.channelId) {
      try {
        setDeletingChannelId(deleteConfirmation.channelId);
        await deleteChannel(deleteConfirmation.channelId);
        showToast({ message: "Channel deleted successfully", type: "success" });
      } catch (error) {
        console.error("Error deleting channel:", error);
        showToast({ message: "Failed to delete channel", type: "error" });
      } finally {
        setDeletingChannelId(null);
        setDeleteConfirmation({ isOpen: false, channelId: null });
      }
    }
  }, [deleteConfirmation.channelId, deleteChannel, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, channelId: null });
  }, []);

  const handleChannelClick = useCallback(
    (channelId: string) => {
      navigate(`/channel/${channelId}`);
    },
    [navigate]
  );

  if (authLoading || loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error loading channels: {error.message}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <p>Please log in to view channels.</p>
        <button onClick={() => navigate("/login")} className="btn btn-primary">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="channel-list">
      <h2>Channels</h2>
      <ul className="channel-items">
        {sortedChannels.map((channel: Channel) => (
          <li
            key={channel.id}
            className={`channel-item ${
              profile?.subscribedChannels?.includes(channel.id)
                ? "subscribed"
                : ""
            }`}>
            {editingChannelId === channel.id ? (
              <Form
                fields={[
                  {
                    name: "channelName",
                    type: "text",
                    placeholder: "Channel name",
                    required: true,
                    defaultValue: channel.name,
                  },
                ]}
                onSubmit={handleUpdateChannel}
                submitButtonText="Update"
              />
            ) : (
              <>
                <div
                  className="channel-info"
                  onClick={() => handleChannelClick(channel.id)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleChannelClick(channel.id)
                  }
                  role="button"
                  tabIndex={0}>
                  <div className="channel-header">
                    <span className="channel-name">
                      <FaHashtag className="icon" /> {channel.name}
                    </span>
                  </div>
                  <div className="channel-meta">
                    <span
                      className={`channel-creator ${
                        channel.createdBy === user?.uid ? "current-user" : ""
                      }`}>
                      <FaUser className="icon" />{" "}
                      {creatorUsernames[channel.createdBy] || "Loading..."}
                    </span>
                    <span
                      className={`channel-date ${
                        channel.createdBy === user?.uid ? "current-user" : ""
                      }`}>
                      <FaClock className="icon" />{" "}
                      {channel.createdAt?.toMillis
                        ? formatRelativeTime(channel.createdAt.toMillis())
                        : "Just now"}
                    </span>
                    <span className="channel-link-count">
                      <FaLink className="icon" />{" "}
                      {linkCountsLoading ? "Loading..." : linkCounts[channel.id] || 0}
                    </span>
                  </div>
                </div>
                {channel.createdBy === user?.uid && (
                  <div className="channel-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChannel(channel);
                      }}
                      title="Edit Channel">
                      <FaEdit />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(channel.id);
                      }}
                      title="Delete Channel"
                      disabled={isDeletingChannel}>
                      {deletingChannelId === channel.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          onClick={() => {
            /* Implement load more logic */
          }}
          className="btn btn-secondary load-more-btn">
          Load More
        </button>
      )}
      <div className="add-channel-form">
        <h3>Add New Channel</h3>
        <Form
          fields={[
            {
              name: "channelName",
              type: "text",
              placeholder: "New channel name",
              required: true,
            },
          ]}
          onSubmit={handleAddChannel}
          submitButtonText="Add Channel"
        />
      </div>
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        message="Are you sure you want to delete this channel?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      {isDeletingChannel && (
        <div className="loading-overlay">
          <LoadingSpinner size="large" />
        </div>
      )}
    </div>
  );
};

export default ChannelList;
