import Column from './Column';
import Row from './Row';

// TODO: replace this with shadcn/radix

const Menu = () => (
  <div className="mt-2 mr-2 w-[140px] rounded-sm border bg-white shadow-lg">
    <Row href="/">Home</Row>
    <Row href="/today">Today</Row>
    <Row href="/recently-played">Recent tapes</Row>
    <Row href="/tape-box">Tape Box</Row>
    <Row href="/playlists">Playlists</Row>
    <Row href="/favorites">Favorites</Row>
    <Row href="/app">App</Row>
    <Row href="/about">About</Row>
    <Row href="/account">Account</Row>
  </div>
);

export default Menu;
