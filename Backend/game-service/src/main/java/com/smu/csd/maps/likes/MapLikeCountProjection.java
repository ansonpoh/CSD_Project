package com.smu.csd.maps.likes;

import java.util.UUID;

public interface MapLikeCountProjection {
    UUID getMapId();
    Long getLikeCount();
}
