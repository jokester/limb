import {render} from 'preact';
import Router from 'preact-router';
import './index.css';
import debug from 'debug';
import {NotFoundPage} from './pages/404';
import {IndexPage} from './pages';
import {V1DemoPage} from './pages/v1/:namespace';
import {V2RoomPage} from './pages/v2/:roomId';

const logger = debug('app:main');

function RootRouter() {
  return (
    <Router>
      <IndexPage path="/" />
      <V1DemoPage path="/v1/:namespace" />
      <V2RoomPage path="/v2/:roomId" />
      <NotFoundPage default />
    </Router>
  );
}
render(<RootRouter />, document.getElementById('app')!);

logger('app loaded');
