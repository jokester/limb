import {render} from 'preact';
import Router from 'preact-router';
import './index.css';
import debug from 'debug';
import {NotFoundPage} from './pages/404';
import {IndexPage} from './pages';
import {TopicPage} from './pages/topics/:uuid';

const logger = debug('app:main');

function RootRouter() {
  return (
    <Router>
      <IndexPage path="/" />
      <TopicPage path="/topics/:uuid" />
      <NotFoundPage default />
    </Router>
  );
}
render(<RootRouter />, document.getElementById('app')!);

logger('app loaded');
