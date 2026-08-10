import { NextResponse } from 'next/server';

export async function GET() {
  const socialVaultData = {
    "success": true,
    "data": {
      "success": true,
      "credits_charged": 1,
      "data": {
        "user": {
          "biography": "Simplicity, Science, & Soul. 🌱 Looking for Ned? We've moved! Be sure to follow @foriawellness to find your favorite Ned products!",
          "bio_links": {
            "0": {
              "title": "Shop Ned on Foria",
              "lynx_url": "https://l.instagram.com/?u=http%3A%2F%2Fwww.foriawellness.com%2F&e=AUDtpFDecB0YQLp60oMzhrkwCDDkPxhryAU1C7b9Y_DpzpCmy3Mhf97N-aUzQgc1BpcD43XdEis4c_K4hS0MQXoGL1llUy34",
              "url": "http://www.foriawellness.com",
              "link_type": "external"
            }
          },
          "biography_with_entities": {
            "raw_text": "Simplicity, Science, & Soul. 🌱 Looking for Ned? We've moved! Be sure to follow @foriawellness to find your favorite Ned products!",
            "entities": {}
          },
          "external_url": "http://www.foriawellness.com/",
          "edge_followed_by": {
            "count": 35686
          },
          "fbid": "17841406438520964",
          "edge_follow": {
            "count": 864
          },
          "full_name": "Ned",
          "id": "6327718617",
          "is_business_account": true,
          "is_professional_account": true,
          "business_address_json": {
            "city_name": null,
            "city_id": null,
            "latitude": null,
            "longitude": null,
            "street_address": null,
            "zip_code": null
          },
          "category_name": null,
          "is_private": false,
          "is_verified": false,
          "profile_pic_url": "https://scontent-man2-1.cdninstagram.com/v/t51.2885-19/98119140_265675268175331_2272625800865906688_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDQ0LmMyIn0&_nc_ht=scontent-man2-1.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2gG5Lrol703Lxf4oUTabjWfX5WtlHrCbwpBc2x68ctKviTcmIabYhQY9GsFis6Qw5GM&_nc_ohc=Qg7XHpiYe_EQ7kNvwE514A4&_nc_gid=Ts_e0BIvObkoFki7vWORNg&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AQHHaMcoloqs84XeNlk642f_zNXqdmamIa9-P9o41KH6Rg&oe=6A7F65CB&_nc_sid=8b3546",
          "profile_pic_url_hd": "https://scontent-man2-1.cdninstagram.com/v/t51.2885-19/98119140_265675268175331_2272625800865906688_n.jpg?stp=dst-jpg_s320x320_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDQ0LmMyIn0&_nc_ht=scontent-man2-1.cdninstagram.com&_nc_cat=107&_nc_oc=Q6cZ2gG5Lrol703Lxf4oUTabjWfX5WtlHrCbwpBc2x68ctKviTcmIabYhQY9GsFis6Qw5GM&_nc_ohc=Qg7XHpiYe_EQ7kNvwE514A4&_nc_gid=Ts_e0BIvObkoFki7vWORNg&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AQF3dMP0ppud0Za6-ewJKyPuV0lqw7YazmyGzoC9l6EjiQ&oe=6A7F65CB&_nc_sid=8b3546",
          "username": "ned",
          "edge_felix_video_timeline": {
            "count": 5,
            "page_info": {
              "has_next_page": false,
              "end_cursor": ""
            },
            "edges": {} 
          },
          "edge_owner_to_timeline_media": {
            "count": 1770,
            "page_info": {
              "has_next_page": true,
              "end_cursor": "QVFBM3ZuLVlXYmJYVHRxNVoyYWhsbHlWV0FueXRib0RlQTBaZFhjT09FMHNXT3FYaGdmRkdDWWozcWFZMkxZdGc5WjNvbFU5VmZtMjQ1VlZPX29CLU53WA=="
            },
            "edges": []
          }
        }
      }
    },
    "credits_used": 1,
    "endpoint": "instagram/profile"
  };

  // Mengembalikan data JSON dengan status 200 (OK)
  return NextResponse.json(socialVaultData);
}