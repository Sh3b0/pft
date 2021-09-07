## Instructions for testing locally (from terminal)

1. Install requirements `pip install -r requirements.txt`
2. The following environment variables has to be set
   ```
    FLASK_APP = path/to/app.py  
    FLASK_ENV = development  
    FLASK_DEBUG = 1  
   ```
3. Run application `python -m flask run`
4. Navigate to `<server_root>/sender`

## Note

HTML files in /templates directory are created only for testing.  
Frontend code for the website should be in /frontend directory.  
