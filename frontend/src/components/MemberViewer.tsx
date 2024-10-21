import React from "react";
import { DiscordMember } from "../Types";

interface MemberViewerProps {
  members: DiscordMember[];
}

export const MemberViewer: React.FC<MemberViewerProps> = ({ members }) => {
  if (members.length === 0) {
    return <p>No members</p>;
  }

  const currentMemberCount = members.filter(
    (m) => m.roles.currentMember
  ).length;
  const formerMemberCount = members.filter((m) => m.roles.formerMember).length;

  return (
    <div>
      <h2>Members</h2>
      <div className="stats">
        <p>Total Members: {members.length}</p>
        <p>Current Members: {currentMemberCount}</p>
        <p>Former Members: {formerMemberCount}</p>
      </div>
      <table className="members-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Roles</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => {
            const roleTexts = [];
            if (member.roles.currentMember) {
              roleTexts.push("Current Member");
            }
            if (member.roles.formerMember) {
              roleTexts.push("Former Member");
            }
            return (
              <tr key={index}>
                <td>{member.username}</td>
                <td>{roleTexts.join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style>{`
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }

        .stats p {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          text-align: center;
        }

        .members-table table, th, td {
          border: 1px solid;
          padding: 5px;
        }
      `}</style>
    </div>
  );
};
