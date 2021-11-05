package models

import (
	"strings"
)

const (
	// MaxAnnotationTagValueLength is the maximum allowed length for a tag value in bytes.
	MaxTagValueLength = 100
)

// ErrTagValueTooLong indicates that the given tag value has a length greater than MaxTagValueLength.
type ErrTagValueTooLong struct {
	TagKey   string
	TagValue string
}

func (e *ErrTagValueTooLong) Error() string {
	return fmt.Sprintf("value for tag '%s' is too long: %d > %d", e.TagKey, len(e.TagValue), MaxTagValueLength)
}

type Tag struct {
	Id    int64
	Key   string
	Value string
}

func ParseTagPairs(tagPairs []string) (tags []*Tag) {
	if tagPairs == nil {
		return []*Tag{}
	}

	for _, tagPair := range tagPairs {
		var tag Tag

		if strings.Contains(tagPair, ":") {
			keyValue := strings.Split(tagPair, ":")
			tag.Key = strings.Trim(keyValue[0], " ")
			tag.Value = strings.Trim(keyValue[1], " ")
		} else {
			tag.Key = strings.Trim(tagPair, " ")
		}

		if tag.Key == "" || ContainsTag(tags, &tag) {
			continue
		}

		tags = append(tags, &tag)
	}

	return tags
}

func ContainsTag(existingTags []*Tag, tag *Tag) bool {
	for _, t := range existingTags {
		if t.Key == tag.Key && t.Value == tag.Value {
			return true
		}
	}
	return false
}

func JoinTagPairs(tags []*Tag) []string {
	tagPairs := []string{}

	for _, tag := range tags {
		if tag.Value != "" {
			tagPairs = append(tagPairs, tag.Key+":"+tag.Value)
		} else {
			tagPairs = append(tagPairs, tag.Key)
		}
	}

	return tagPairs
}
