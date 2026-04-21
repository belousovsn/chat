type DashboardToolbarProps = {
  onOpenCreateRoom: () => void;
  onOpenSettings: () => void;
  onOpenSocial: () => void;
  onSignOut: () => void;
  windowTitle: string;
};

export function DashboardToolbar(props: DashboardToolbarProps) {
  return (
    <header>
      <div className="oldschool-titlebar">
        <span>{props.windowTitle}</span>
        <div className="oldschool-window-buttons" aria-hidden="true">
          <span>_</span>
          <span>[]</span>
          <span>X</span>
        </div>
      </div>

      <nav className="oldschool-menubar live-menubar" aria-label="Main menu">
        <button type="button" className="oldschool-menu-item" onClick={props.onOpenCreateRoom}>Rooms</button>
        <button type="button" className="oldschool-menu-item" onClick={props.onOpenSocial}>Friends</button>
        <button type="button" className="oldschool-menu-item" onClick={props.onOpenSettings}>Settings</button>
        <span className="oldschool-menu-spacer" />
        <button type="button" className="oldschool-menu-item" onClick={props.onSignOut}>Sign out</button>
      </nav>
    </header>
  );
}
