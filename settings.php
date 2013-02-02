<?php function podlovewebplayer_settings_page() { ?>

<div class="wrap">
<h2>Podlove Web Player Options</h2>

<p>See <a href="http://mediaelementjs.com/">MediaElementjs.com</a> for more details on how the HTML5 player and Flash fallbacks work.</p>

<form method="post" action="options.php">

<?php settings_fields('podlovewebplayer_options'); ?>
<?php do_settings_sections('podlovewebplayer'); ?>

<input name="Submit" type="submit" value="<?php esc_attr_e('Save Changes'); ?>" />

</form>

</div>

<?php } 


function podlovewebplayer_create_menu() {
  add_options_page(
    'Podlove Web Player Options', 
    'Podlove Web Player', 
    'manage_options', 
    'podlovewebplayer', 
    'podlovewebplayer_settings_page'
  );
}

function podlovewebplayer_register_settings() {
  register_setting( 'podlovewebplayer_options', 'podlovewebplayer_options');

  add_settings_section( 'podlovewebplayer_enclosures', 'Enclosures', false, 'podlovewebplayer' );
  add_settings_field( 
    'podlovewebplayer_enclosure_detect', 
    '<label for="pwpenclosures1">Turn enclosures to players</label>',
    function(){ 
      $options = get_option('podlovewebplayer_options');
      $checked = "";
      if ( isset( $options['enclosure_detect'] ) )
        $checked = "checked ";
      print "<input id='pwpenclosures1' name='podlovewebplayer_options[enclosure_detect]' 
        $checked type='checkbox' value='1' />";
    }, 'podlovewebplayer', 'podlovewebplayer_enclosures');
  
  /*
  add_settings_field( 'podlovewebplayer_enclosures', 'pwp_enclosure_force' );
  add_settings_field( 'podlovewebplayer_enclosures', 'pwp_enclosure_bottom' );
  */

  add_settings_section( 'podlovewebplayer_audio', 'Audio player defaults', false, 'podlovewebplayer' );

  /*
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_height' );
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_width' );
  add_settings_field( 'podlovewebplayer_audio', 'pwp_default_audio_type' );

  add_settings_section( 'podlovewebplayer_video', 'Video player defaults', function(){}, 'podlovewebplayer' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_height' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_width' );
  add_settings_field( 'podlovewebplayer_video', 'pwp_default_video_type' );
  */
}


if ( is_admin() ){
  add_action( 'admin_menu', 'podlovewebplayer_create_menu' );
  add_action( 'admin_init', 'podlovewebplayer_register_settings' );
}

?>