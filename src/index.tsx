import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './components/home';

const container = document.getElementById('root');
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<Home />);
