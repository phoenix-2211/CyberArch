from app import create_app
from models import db, BlockedIP
app = create_app()
with app.app_context():
    BlockedIP.query.delete()
    db.session.commit()
    print('All blocked IPs cleared')
