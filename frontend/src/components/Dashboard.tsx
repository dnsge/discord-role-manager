import React, { useState, useEffect } from "react";
import { CSVReader } from "./CSVReader";
import { RoleDiffViewer } from "./RoleDiffViewer";
import { useAuth } from "../context/AuthContext";
import { DiscordMember, RoleChange } from "../Types";
import { useNavigate } from "react-router-dom";
import { MemberViewer } from "./MemberViewer";

interface MemberData {
  username: string;
  status: "Current Member" | "Former Member";
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [memberData, setMemberData] = useState<MemberData[]>([]);
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>([]);
  const [changes, setChanges] = useState<RoleChange[] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate("/login");
        } else {
          throw new Error("Failed to fetch members");
        }
      }

      const data = await response.json();
      setDiscordMembers(data.members);
      setError(null);
    } catch (err) {
      setError("Failed to load Discord members. Please try again later.");
      console.error("Error fetching members:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const calculateChanges = (csvData: MemberData[]) => {
    const changes: RoleChange[] = [];

    for (const csvMember of csvData) {
      if (!csvMember.username) {
        continue;
      }

      const discordMember = discordMembers.find(
        (dm) => dm.username.toLowerCase() === csvMember.username.toLowerCase()
      );

      if (!discordMember) {
        console.warn(`Member not found: ${csvMember.username}`);
        continue;
      }

      const shouldBeCurrentMember = csvMember.status === "Current Member";
      const shouldBeFormerMember = csvMember.status === "Former Member";

      // Check if we need to add Current Member role
      if (shouldBeCurrentMember && !discordMember.roles.currentMember) {
        changes.push({
          userId: discordMember.id,
          username: discordMember.username,
          role: "Current Member",
          action: "add",
        });
      }

      // Check if we need to add Former Member role
      if (shouldBeFormerMember && !discordMember.roles.formerMember) {
        changes.push({
          userId: discordMember.id,
          username: discordMember.username,
          role: "Former Member",
          action: "add",
        });
      }

      // Check if we need to remove Current Member role
      if (!shouldBeCurrentMember && discordMember.roles.currentMember) {
        changes.push({
          userId: discordMember.id,
          username: discordMember.username,
          role: "Current Member",
          action: "remove",
        });
      }

      // Check if we need to remove Former Member role
      if (!shouldBeFormerMember && discordMember.roles.formerMember) {
        changes.push({
          userId: discordMember.id,
          username: discordMember.username,
          role: "Former Member",
          action: "remove",
        });
      }
    }

    return changes;
  };

  const handleCSVUpload = (data: MemberData[]) => {
    setMemberData(data);
    const newChanges = calculateChanges(data);
    setChanges(newChanges);
  };

  const applyChanges = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/members/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ changes }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          navigate("/login");
        } else {
          throw new Error(`Failed to apply changes: Status ${response.status}`);
        }
      }

      // Refresh member list after successful update
      await fetchMembers();
      setChanges([]);
      setMemberData([]);
    } catch (error) {
      console.error("Failed to apply changes:", error);
      setError("Failed to apply changes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div>Loading members...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchMembers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Discord Role Manager</h1>

      <section className="current-status">
        <MemberViewer members={discordMembers} />
      </section>

      <section className="upload-section">
        <CSVReader onUpload={handleCSVUpload} />
      </section>

      {changes !== null &&
        (changes.length > 0 ? (
          <RoleDiffViewer
            changes={changes}
            onApplyChanges={applyChanges}
            isUpdating={isUpdating}
          />
        ) : (
          <p>No changes required</p>
        ))}

      <style>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .error-container {
          text-align: center;
          padding: 20px;
        }

        .error-message {
          color: #dc3545;
          margin-bottom: 10px;
        }

        section {
          margin-bottom: 30px;
        }
      `}</style>
    </div>
  );
};
