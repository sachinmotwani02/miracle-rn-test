// First, so the craft showcase can take over the clock before anything reads it (web only, no-op elsewhere).
import './src/dev/craftFrame';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
