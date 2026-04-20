type DashboardToolbarProps = {
  onOpenCreateRoom: () => void;
  onOpenSettings: () => void;
  onOpenSocial: () => void;
  onSignOut: () => void;
};

export function DashboardToolbar(props: DashboardToolbarProps) {
  return (
    <header className="topbar">
      <div>
        <div className="logo">Northstar Chat</div>
        <p className="toolbar-copy">Chats first. Everything else on demand.</p>
      </div>
      <nav className="topnav">
        <button className="primary" onClick={props.onOpenCreateRoom}>New room</button>
        <button className="ghost" onClick={props.onOpenSocial}>People</button>
        <button className="ghost" onClick={props.onOpenSettings}>Settings</button>
        <button className="ghost" onClick={props.onSignOut}>Sign out</button>
      </nav>
    </header>
  );
}
