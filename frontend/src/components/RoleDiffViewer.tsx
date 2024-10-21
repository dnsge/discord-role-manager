import React from "react";
import { RoleChange } from "../Types";

interface RoleDiffViewerProps {
  changes: RoleChange[];
  onApplyChanges: () => void;
  isUpdating: boolean;
}

export const RoleDiffViewer: React.FC<RoleDiffViewerProps> = ({
  changes,
  onApplyChanges,
  isUpdating,
}) => {
  if (changes.length === 0) {
    return <p>No role changes needed.</p>;
  }

  return (
    <div>
      <h2>Proposed Changes</h2>
      <table className="changes-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Action</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, index) => (
            <tr key={index}>
              <td>{change.username}</td>
              <td>{change.action}</td>
              <td>{change.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={onApplyChanges} disabled={isUpdating}>
        {isUpdating ? "Applying Changes..." : "Apply Changes"}
      </button>
      <style>{`
        .changes-table table, th, td {
          border: 1px solid;
          padding: 5px;
        }
      `}</style>
    </div>
  );
};
