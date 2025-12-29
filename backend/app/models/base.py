"""Base Pydantic models with camelCase configuration."""

from humps import camelize
from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    return camelize(string)


class CamelModel(BaseModel):
    """Base model that serializes to camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

