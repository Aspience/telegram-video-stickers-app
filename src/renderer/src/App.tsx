import React from 'react';
import {Alert, Box, Snackbar} from '@mui/material';

import {Editor} from './screens/Editor';
import {Result} from './screens/Result';
import {Uploader} from './screens/Uploader';
import {useStore} from './store';

const App: React.FC = () => {
  const {file, processedFile, notification, hideNotification} = useStore((state) => state);

  let content: React.ReactNode;
  if (processedFile) {
    content = <Result />;
  } else if (file) {
    content = <Editor />;
  } else {
    content = <Uploader />;
  }

  return (
    <Box sx={{height: '100vh', width: '100vw', bgcolor: '#f5f5f5'}}>
      {content}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={hideNotification}
        anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      >
        {notification ? (
          <Alert onClose={hideNotification} severity={notification.severity} sx={{width: '100%'}}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default App;
