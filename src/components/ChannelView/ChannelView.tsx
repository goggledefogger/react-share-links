import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { useChannels } from "../../hooks/useChannels";
import { useAuthUser } from "../../hooks/useAuthUser";
import { Channel, Link } from "../../types";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import Form from "../common/Form";
import ConfirmDialog from "../common/ConfirmDialog";
import LinkItem from "../LinkItem/LinkItem";
import { useToast } from "../../contexts/ToastContext";
import LoadingSpinner from "../common/LoadingSpinner";
import "./ChannelView.css";
import { FaEdit, FaTrash, FaBell, FaBellSlash } from 'react-icons/fa';
import { updateUserProfile } from "../../utils/userUtils"; // Adjust the import path as needed

const LINKS_PER_PAGE = 20;

const useChannelData = (channelId: string | undefined) => {
  const [channelData, setChannelData] = useState<{
    channel: Channel | null;
    links: Link[];
  }>({ channel: null, links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!channelId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const channelRef = doc(db, "channels", channelId);
    const linksQuery = query(
      collection(db, "links"),
      where("channelId", "==", channelId),
      orderBy("createdAt", "desc"),
      limit(LINKS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      channelRef,
      (channelDoc) => {
        if (!channelDoc.exists()) {
          setError(new Error("Channel not found"));
          setLoading(false);
          return;
        }

        const channelData = {
          id: channelDoc.id,
          ...channelDoc.data(),
        } as Channel;

        const linksUnsubscribe = onSnapshot(
          linksQuery,
          (linksSnapshot) => {
            const links = linksSnapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Link)
            );
            setChannelData({ channel: channelData, links });
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching links:", err);
            setError(err);
            setLoading(false);
          }
        );

        unsubscribeRef.current = () => {
          linksUnsubscribe();
        };
      },
      (err) => {
        console.error("Error fetching channel:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [channelId]);

  return { ...channelData, loading, error };
};

const ChannelView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { channel, links, loading, error } = useChannelData(id);
  const { addLink, deleteLink, addEmojiReaction, removeEmojiReaction, updateChannel, deleteChannel, isDeletingChannel } = useChannels();
  const { showToast } = useToast();
  const { user, profile } = useAuthUser();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    linkId: string | null;
    channelId: string | null;
  }>({
    isOpen: false,
    linkId: null,
    channelId: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && channel) {
      setIsSubscribed(profile.subscribedChannels?.includes(channel.id) || false);
    }
  }, [profile, channel]);

  const handleAddLink = useCallback(
    async (formData: { [key: string]: string }) => {
      const { url } = formData;
      if (id && url.trim()) {
        try {
          await addLink(id, url);
          showToast({ message: "Link added successfully", type: "success" });
        } catch (error) {
          console.error("Error adding link:", error);
          showToast({
            message:
              error instanceof Error ? error.message : "Failed to add link",
            type: "error",
          });
        }
      }
    },
    [id, addLink, showToast]
  );

  const handleDeleteClick = useCallback(
    (linkId: string) => {
      const link = links.find((l) => l.id === linkId);
      if (link && link.userId === user?.uid) {
        setDeleteConfirmation({ isOpen: true, linkId, channelId: null });
      } else {
        showToast({
          message: "You don't have permission to delete this link",
          type: "error",
        });
      }
    },
    [links, user?.uid, showToast]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmation.linkId) {
      try {
        await deleteLink(deleteConfirmation.linkId);
        showToast({ message: "Link deleted successfully", type: "success" });
      } catch (error) {
        console.error("Error deleting link:", error);
        showToast({
          message:
            error instanceof Error ? error.message : "Failed to delete link",
          type: "error",
        });
      }
      setDeleteConfirmation({ isOpen: false, linkId: null, channelId: null });
    }
  }, [deleteConfirmation.linkId, deleteLink, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, linkId: null, channelId: null });
  }, []);

  const handleReact = useCallback(
    async (linkId: string, emoji: string) => {
      try {
        await addEmojiReaction(linkId, emoji, user?.uid);
      } catch (error) {
        console.error("Error adding emoji reaction:", error);
        showToast({ message: "Failed to add emoji reaction", type: "error" });
      }
    },
    [addEmojiReaction, user?.uid, showToast]
  );

  const handleRemoveReaction = useCallback(
    async (linkId: string, emoji: string) => {
      try {
        await removeEmojiReaction(linkId, emoji, user?.uid);
      } catch (error) {
        console.error("Error removing emoji reaction:", error);
        showToast({
          message: "Failed to remove emoji reaction",
          type: "error",
        });
      }
    },
    [removeEmojiReaction, user?.uid, showToast]
  );

  const handleEditChannel = () => {
    setIsEditing(true);
  };

  const handleUpdateChannel = async (formData: { [key: string]: string }) => {
    if (id) {
      try {
        await updateChannel(id, formData.channelName);
        showToast({ message: "Channel updated successfully", type: "success" });
        setIsEditing(false);
      } catch (error) {
        console.error("Error updating channel:", error);
        showToast({
          message: error instanceof Error ? error.message : "Failed to update channel",
          type: "error",
        });
      }
    }
  };

  const handleDeleteChannel = () => {
    if (id) {
      setDeleteConfirmation({ isOpen: true, linkId: null, channelId: id });
    }
  };

  const handleDeleteChannelConfirm = async () => {
    if (deleteConfirmation.channelId) {
      try {
        setIsDeleting(true);
        await deleteChannel(deleteConfirmation.channelId);
        showToast({ message: "Channel deleted successfully", type: "success" });
        navigate('/');
      } catch (error) {
        console.error("Error deleting channel:", error);
        showToast({
          message: error instanceof Error ? error.message : "Failed to delete channel",
          type: "error",
        });
      } finally {
        setIsDeleting(false);
        setDeleteConfirmation({ isOpen: false, linkId: null, channelId: null });
      }
    }
  };

  const handleSubscriptionToggle = async () => {
    if (!user || !channel) return;

    try {
      const updatedSubscribedChannels = isSubscribed
        ? profile?.subscribedChannels?.filter(id => id !== channel.id) || []
        : [...(profile?.subscribedChannels || []), channel.id];

      await updateUserProfile(user.uid, {
        subscribedChannels: updatedSubscribedChannels,
      });

      setIsSubscribed(!isSubscribed);
      showToast({
        message: isSubscribed ? "Unsubscribed from channel" : "Subscribed to channel",
        type: "success",
      });
    } catch (error) {
      console.error("Error toggling subscription:", error);
      showToast({
        message: "Failed to update subscription",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }

  if (!channel) {
    return <div className="error">Channel not found</div>;
  }

  return (
    <div className="channel-view">
      <div className="channel-header">
        {isEditing ? (
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
            submitButtonClass="btn btn-primary"
          />
        ) : (
          <>
            <h2 className="channel-title">Channel: {channel.name}</h2>
            <div className="channel-actions">
              <button
                className={`subscription-toggle ${isSubscribed ? 'subscribed' : ''}`}
                onClick={handleSubscriptionToggle}
                title={isSubscribed ? "Unsubscribe" : "Subscribe"}
              >
                {isSubscribed ? <FaBell /> : <FaBellSlash />}
              </button>
              {channel.createdBy === user?.uid && (
                <>
                  <button className="btn-icon" onClick={handleEditChannel} title="Edit Channel">
                    <FaEdit />
                  </button>
                  <button className="btn-icon" onClick={handleDeleteChannel} title="Delete Channel">
                    <FaTrash />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <RouterLink to="/" className="back-link">
        Back to Channels
      </RouterLink>

      <div className="add-link-form">
        <h3>Add New Link</h3>
        <Form
          fields={[
            {
              name: "url",
              type: "text",
              placeholder: "Enter a URL",
              required: true,
            },
          ]}
          onSubmit={handleAddLink}
          submitButtonText="Add Link"
          submitButtonClass="btn btn-primary"
        />
      </div>

      <ul className="link-list">
        {links.map((link) => (
          <li key={link.id}>
            <LinkItem
              link={link}
              onDelete={handleDeleteClick}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
            />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        message={deleteConfirmation.channelId
          ? "Are you sure you want to delete this channel? This action cannot be undone."
          : "Are you sure you want to delete this link?"}
        onConfirm={deleteConfirmation.channelId ? handleDeleteChannelConfirm : handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {(isDeleting || isDeletingChannel) && (
        <div className="loading-overlay">
          <LoadingSpinner size="large" />
        </div>
      )}
    </div>
  );
};

export default React.memo(ChannelView);
