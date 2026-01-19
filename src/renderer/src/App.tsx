import React from 'react';
import {Box} from '@mui/material';

import {Editor} from './components/Editor';
import {Result} from './components/Result';
import {Uploader} from './components/Uploader';
import {useStore} from './store';

const App: React.FC = () => {
  const {file, processedFile} = useStore((state) => state);

  let content;
  if (processedFile) {
    content = <Result />;
  } else if (file) {
    content = <Editor />;
  } else {
    content = <Uploader />;
  }

  return <Box sx={{height: '100vh', width: '100vw', bgcolor: '#f5f5f5'}}>{content}</Box>;
};

export default App;
