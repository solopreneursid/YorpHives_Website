// A direct tool visit is recorded locally. No inputs, files or user data are stored.
import {recordRecent} from './personal-space.mjs';
try{recordRecent(window.localStorage,'tools',location.pathname.replace(/^\/+/,''))}catch{}
