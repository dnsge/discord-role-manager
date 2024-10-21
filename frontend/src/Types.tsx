export interface RoleChange {
  userId: string;
  username: string;
  role: string;
  action: "add" | "remove";
}

export interface DiscordMember {
  id: string;
  username: string;
  roles: {
    currentMember: boolean;
    formerMember: boolean;
  };
}
