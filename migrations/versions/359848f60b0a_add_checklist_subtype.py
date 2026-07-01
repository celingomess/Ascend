"""add checklist subtype

Revision ID: 359848f60b0a
Revises: 56764f48187f
Create Date: 2026-06-02 12:49:05.333539
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

revision = '359848f60b0a'
down_revision = '56764f48187f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('goal_block_items', schema=None) as batch_op:
        batch_op.alter_column(
            'tipo',
            existing_type=mysql.VARCHAR(length=30),
            nullable=False
        )


def downgrade():
    with op.batch_alter_table('goal_block_items', schema=None) as batch_op:
        batch_op.alter_column(
            'tipo',
            existing_type=mysql.VARCHAR(length=30),
            nullable=True
        )