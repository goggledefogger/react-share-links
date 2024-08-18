import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
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
  const { addLink, deleteLink, addEmojiReaction, removeEmojiReaction } =
    useChannels();
  const { showToast } = useToast();
  const { user } = useAuthUser();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    linkId: string | null;
  }>({
    isOpen: false,
    linkId: null,
  });

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
        setDeleteConfirmation({ isOpen: true, linkId });
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
      setDeleteConfirmation({ isOpen: false, linkId: null });
    }
  }, [deleteConfirmation.linkId, deleteLink, showToast]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, linkId: null });
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
      <h2 className="channel-title">Channel: {channel.name}</h2>
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
        message="Are you sure you want to delete this link?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default React.memo(ChannelView);
