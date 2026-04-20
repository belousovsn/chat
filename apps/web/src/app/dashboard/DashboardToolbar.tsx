type DashboardToolbarProps = {
  canManageRoom: boolean;
  onOpenCreateRoom: () => void;
  onOpenManageRoom: () => void;
  onRefreshContacts: () => void;
  onRefreshSessions: () => void;
  onSignOut: () => void;
};

export function DashboardToolbar(props: DashboardToolbarProps) {
  return (
    <header className="topbar">
      <div className="logo">ChatLogo</div>
      <nav className="topnav">
        <button onClick={props.onOpenCreateRoom}>Create room</button>
        <button onClick={props.onOpenManageRoom} disabled={!props.canManageRoom}>Manage room</button>
        <button onClick={props.onRefreshSessions}>Sessions</button>
        <button onClick={props.onRefreshContacts}>Contacts</button>
        <button onClick={props.onSignOut}>Sign out</button>
      </nav>
    </header>
  );
}
